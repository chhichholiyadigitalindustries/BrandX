import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import crypto, { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { authService } from '../src/services/authService.js';
import { storageProvider, generateSafeFileName, getValidatedExtension, sanitizeFolder } from '../src/integrations/storageProvider.js';
import { signRefreshToken } from '../src/utils/jwt.js';

describe('BRANDX — Security Remediation Regression Suite', () => {
  let server: any;
  let baseUrl = '';
  const ts = Date.now();

  const testUserIds: string[] = [];

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        const port = typeof address === 'string' ? address : address?.port;
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      server.close();
    }
    // Clean up test sessions and test users
    for (const uid of testUserIds) {
      try {
        await prisma.userSession.deleteMany({ where: { userId: uid } });
        await prisma.businessSettings.deleteMany({ where: { business: { ownerId: uid } } });
        await prisma.business.deleteMany({ where: { ownerId: uid } });
        await prisma.user.deleteMany({ where: { id: uid } });
      } catch {}
    }
  });

  describe('Finding 1: Refresh Token & Session Security', () => {
    it('1.1 Login -> Obtain refresh token -> Refresh successfully -> Logout -> Refresh MUST fail with 401', async () => {
      const auth = await authService.authenticateWithFirebase(`test_firebase_remediation_user_1_${ts}`, {
        name: 'Remediation User 1',
      });
      testUserIds.push(auth.user.id);

      const initialRefreshToken = auth.tokens.refreshToken;
      assert.ok(initialRefreshToken, 'Initial refresh token should exist');

      // 1. Refresh successfully
      const resRefresh = await fetch(`${baseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: initialRefreshToken }),
      });
      assert.strictEqual(resRefresh.status, 200, 'Initial refresh must succeed with HTTP 200');
      const refreshData = await resRefresh.json();
      assert.ok(refreshData.data?.accessToken, 'New access token must be issued');
      const rotatedRefreshToken = refreshData.data?.refreshToken;
      assert.ok(rotatedRefreshToken, 'Rotated refresh token must be issued');

      // 2. Replay of old rotated token MUST fail
      const resReplay = await fetch(`${baseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: initialRefreshToken }),
      });
      assert.strictEqual(resReplay.status, 401, 'Replayed old refresh token must be rejected with HTTP 401');

      // 3. Logout with the active rotated token
      const resLogout = await fetch(`${baseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshData.data.accessToken}`,
        },
        body: JSON.stringify({ refreshToken: rotatedRefreshToken }),
      });
      assert.strictEqual(resLogout.status, 200, 'Logout must succeed with HTTP 200');

      // 4. Attempt to use rotated refresh token after logout MUST fail
      const resPostLogout = await fetch(`${baseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rotatedRefreshToken }),
      });
      assert.strictEqual(resPostLogout.status, 401, 'Refresh token after logout MUST return HTTP 401');
    });

    it('1.2 Multi-Device Session Isolation: Logging out Device A must NOT invalidate Device B', async () => {
      const auth = await authService.authenticateWithFirebase(`test_firebase_multidevice_user_${ts}`, {
        name: 'MultiDevice User',
      });
      testUserIds.push(auth.user.id);

      // Simulate Device A session
      const deviceAToken = auth.tokens.refreshToken;

      // Simulate Device B login
      const deviceBAuth = await authService.authenticateWithFirebase(
        `test_firebase_multidevice_user_${ts}`,
        undefined,
        '10.0.0.2',
        'BrandX-Mobile-App-DeviceB'
      );
      const deviceBToken = deviceBAuth.tokens.refreshToken;

      assert.notStrictEqual(deviceAToken, deviceBToken, 'Device A and B must have distinct refresh tokens');

      // Verify two distinct sessions in PostgreSQL
      const sessions = await prisma.userSession.findMany({
        where: { userId: auth.user.id },
      });
      assert.ok(sessions.length >= 2, 'User must have at least 2 active sessions in database');

      // Logout Device A
      const resLogoutA = await fetch(`${baseUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: deviceAToken }),
      });
      assert.strictEqual(resLogoutA.status, 200, 'Device A logout must succeed');

      // Device A refresh MUST fail
      const resRefreshA = await fetch(`${baseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: deviceAToken }),
      });
      assert.strictEqual(resRefreshA.status, 401, 'Device A refresh must return HTTP 401 after logout');

      // Device B refresh MUST continue working!
      const resRefreshB = await fetch(`${baseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: deviceBToken }),
      });
      assert.strictEqual(resRefreshB.status, 200, 'Device B refresh must succeed with HTTP 200 after Device A logout');
      const bData = await resRefreshB.json();
      assert.ok(bData.data?.accessToken, 'Device B receives new valid access token');
    });

    it('1.3 Expired session in database must return HTTP 401', async () => {
      const auth = await authService.authenticateWithFirebase(`test_firebase_expired_sess_${ts}`, {
        name: 'Expired Session User',
      });
      testUserIds.push(auth.user.id);

      // Artificially expire the session in the database
      await prisma.userSession.updateMany({
        where: { userId: auth.user.id },
        data: { expiresAt: new Date(Date.now() - 10000) },
      });

      const res = await fetch(`${baseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: auth.tokens.refreshToken }),
      });
      assert.strictEqual(res.status, 401, 'Expired session must return HTTP 401');
    });

    it('1.4 Revoked session (isRevoked: true) must return HTTP 401', async () => {
      const auth = await authService.authenticateWithFirebase(`test_firebase_revoked_sess_${ts}`, {
        name: 'Revoked Session User',
      });
      testUserIds.push(auth.user.id);

      await prisma.userSession.updateMany({
        where: { userId: auth.user.id },
        data: { isRevoked: true },
      });

      const res = await fetch(`${baseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: auth.tokens.refreshToken }),
      });
      assert.strictEqual(res.status, 401, 'Revoked session must return HTTP 401');
    });

    it('1.5 Tampered / Invalid signature refresh token must return HTTP 401', async () => {
      const fakeToken = signRefreshToken({ userId: 'fake-id' }) + '_tampered';
      const res = await fetch(`${baseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: fakeToken }),
      });
      assert.strictEqual(res.status, 401, 'Tampered token must return HTTP 401');
    });

    it('1.6 Token with non-existent session identifier must return HTTP 401', async () => {
      const orphanedToken = signRefreshToken({ userId: 'fake-user-id', sessionId: randomUUID() });
      const res = await fetch(`${baseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: orphanedToken }),
      });
      assert.strictEqual(res.status, 401, 'Orphaned session token must return HTTP 401');
    });
  });

  describe('Finding 2: Storage Filename Sanitization & Traversal Prevention', () => {
    it('2.1 Traversal sequences (../../../../etc/passwd.png) must be completely stripped from stored key', () => {
      const safeName = generateSafeFileName('image/png', '../../../../etc/passwd.png');
      assert.ok(!safeName.includes('..'), 'Safe filename must not contain ".."');
      assert.ok(!safeName.includes('/'), 'Safe filename must not contain "/"');
      assert.ok(!safeName.includes('\\'), 'Safe filename must not contain "\\"');
      assert.ok(!safeName.includes('passwd'), 'Safe filename must not preserve user basename');
      assert.match(safeName, /^\d+_[a-f0-9]{8}\.png$/, 'Safe filename must match timestamp_randomId.ext');
    });

    it('2.2 Windows-style traversal sequences (..\\..\\..\\windows\\system32\\test.png) must be sanitized', () => {
      const safeName = generateSafeFileName('image/png', '..\\..\\..\\windows\\system32\\test.png');
      assert.ok(!safeName.includes('..'), 'Safe filename must not contain ".."');
      assert.ok(!safeName.includes('\\'), 'Safe filename must not contain "\\"');
      assert.match(safeName, /^\d+_[a-f0-9]{8}\.png$/);
    });

    it('2.3 Repeated slash traversal (....//....//test.png) must be sanitized', () => {
      const safeName = generateSafeFileName('image/png', '....//....//test.png');
      assert.ok(!safeName.includes('..'));
      assert.ok(!safeName.includes('/'));
      assert.match(safeName, /^\d+_[a-f0-9]{8}\.png$/);
    });

    it('2.4 URL-encoded traversal (%2e%2e%2ftest.png) must be sanitized', () => {
      const safeName = generateSafeFileName('image/png', '%2e%2e%2ftest.png');
      assert.ok(!safeName.includes('%2e'));
      assert.ok(!safeName.includes('..'));
      assert.match(safeName, /^\d+_[a-f0-9]{8}\.png$/);
    });

    it('2.5 Null-byte style filenames must be safely handled', () => {
      const safeName = generateSafeFileName('image/png', 'test\0.png');
      assert.ok(!safeName.includes('\0'));
      assert.match(safeName, /^\d+_[a-f0-9]{8}\.png$/);
    });

    it('2.6 Extreme length filename (5,000 characters) must produce bounded safe filename', () => {
      const longName = 'A'.repeat(5000) + '.png';
      const safeName = generateSafeFileName('image/png', longName);
      assert.ok(safeName.length < 50, `Filename length (${safeName.length}) must be strictly bounded`);
      assert.match(safeName, /^\d+_[a-f0-9]{8}\.png$/);
    });

    it('2.7 Dangerous MIME types must be rejected', () => {
      assert.throws(() => {
        getValidatedExtension('application/x-msdownload', 'virus.exe');
      }, /Unsupported or disallowed file MIME type/);

      assert.throws(() => {
        getValidatedExtension('text/x-shellscript', 'exploit.sh');
      }, /Unsupported or disallowed file MIME type/);
    });

    it('2.8 Folder traversal attempts must be strictly contained inside storage root', async () => {
      const sanitized = sanitizeFolder('../../../../etc');
      assert.strictEqual(sanitized, 'etc', 'Traversal dots must be stripped from folder');

      const harmlessBuffer = Buffer.from('GIF89a safe test image');
      const uploadResult = await storageProvider.uploadFile({
        fileName: '../../../../etc/passwd.png',
        buffer: harmlessBuffer,
        mimeType: 'image/png',
        folder: '../../../../daily-content',
      });

      assert.ok(!uploadResult.key.includes('..'), 'Storage key must not contain traversal characters');
      assert.match(uploadResult.key, /^daily-content\/\d+_[a-f0-9]{8}\.png$/);

      // Clean up uploaded test file
      await storageProvider.deleteFile(uploadResult.key);
    });
  });
});
