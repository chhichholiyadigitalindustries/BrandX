import { prisma } from '../src/config/database.js';
import { storageProvider } from '../src/integrations/storageProvider.js';
import { createApp } from '../src/app.js';
import fs from 'fs';
import path from 'path';

// Minimal 1x1 transparent PNG buffer
const SAMPLE_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Minimal JPEG buffer
const SAMPLE_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0xff, 0xda, 0x00, 0x08,
  0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xbf, 0x80, 0xff, 0xd9
]);

// Minimal WebP buffer
const SAMPLE_WEBP_BUFFER = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
  0x0e, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00, 0x10, 0x07, 0x10, 0x11, 0x11, 0x88, 0x88, 0xfe,
  0x07, 0x00
]);

async function runMediaPipelineTests() {
  console.log('========================================================================');
  console.log(' BRANDX PRODUCTION MEDIA PIPELINE & POSTGRESQL PERSISTENCE AUDIT');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  const createdMediaKeys: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Database Verification (Requirement 15)
    // -------------------------------------------------------------------------
    console.log('[TEST 1] Verifying Neon PostgreSQL MediaAsset table...');
    const mediaCount = await prisma.mediaAsset.count();
    console.log(`  Found ${mediaCount} existing MediaAsset records in PostgreSQL.`);
    assert(typeof mediaCount === 'number', 'PostgreSQL MediaAsset count queried successfully');

    const recentAssets = await prisma.mediaAsset.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        key: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });
    console.log('  Recent MediaAsset records in Neon:', recentAssets.map(a => ({ key: a.key, size: a.sizeBytes, mime: a.mimeType })));
    assert(Array.isArray(recentAssets), 'Recent MediaAsset records retrieved safely without mutations');

    // -------------------------------------------------------------------------
    // TEST 2: Multi-format Media Upload & Validation (Requirement 17)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Testing Media Upload across PNG, JPEG, WebP...');

    // PNG
    const pngResult = await storageProvider.uploadFile({
      fileName: 'test_logo.png',
      buffer: SAMPLE_PNG_BUFFER,
      mimeType: 'image/png',
      folder: 'logos',
    });
    createdMediaKeys.push(pngResult.key);
    assert(pngResult.url.startsWith('/api/v1/media/logos/'), `PNG URL resolved to canonical endpoint: ${pngResult.url}`);
    assert(pngResult.mimeType === 'image/png', 'PNG mimeType correctly stored');
    assert(pngResult.sizeBytes === SAMPLE_PNG_BUFFER.length, 'PNG byte length matches');

    // JPEG
    const jpegResult = await storageProvider.uploadFile({
      fileName: 'morning_test.jpg',
      buffer: SAMPLE_JPEG_BUFFER,
      mimeType: 'image/jpeg',
      folder: 'daily-status',
    });
    createdMediaKeys.push(jpegResult.key);
    assert(jpegResult.url.startsWith('/api/v1/media/daily-status/'), `JPEG URL resolved: ${jpegResult.url}`);
    assert(jpegResult.mimeType === 'image/jpeg', 'JPEG mimeType correctly stored');

    // WebP
    const webpResult = await storageProvider.uploadFile({
      fileName: 'avatar_test.webp',
      buffer: SAMPLE_WEBP_BUFFER,
      mimeType: 'image/webp',
      folder: 'avatars',
    });
    createdMediaKeys.push(webpResult.key);
    assert(webpResult.url.startsWith('/api/v1/media/avatars/'), `WebP URL resolved: ${webpResult.url}`);
    assert(webpResult.mimeType === 'image/webp', 'WebP mimeType correctly stored');

    // Invalid MIME rejection
    let rejectedMime = false;
    try {
      await storageProvider.uploadFile({
        fileName: 'malicious.exe',
        buffer: Buffer.from('NOT_AN_IMAGE'),
        mimeType: 'application/x-msdownload',
      });
    } catch {
      rejectedMime = true;
    }
    assert(rejectedMime, 'Rejected invalid non-image MIME type');

    // Oversized rejection (>10MB)
    let rejectedOversized = false;
    try {
      const hugeBuffer = Buffer.alloc(11 * 1024 * 1024);
      await storageProvider.uploadFile({
        fileName: 'huge.png',
        buffer: hugeBuffer,
        mimeType: 'image/png',
      });
    } catch {
      rejectedOversized = true;
    }
    assert(rejectedOversized, 'Rejected oversized file > 10MB');

    // -------------------------------------------------------------------------
    // TEST 3: PostgreSQL MediaAsset Permanent Source of Truth & Auto-Healing (Requirement 2 & 17)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Testing PostgreSQL persistence & local disk auto-healing...');

    // Verify record exists in DB with binary bytes
    const dbRecord = await prisma.mediaAsset.findUnique({
      where: { key: pngResult.key },
    });
    assert(Boolean(dbRecord), `MediaAsset record found in PostgreSQL for key="${pngResult.key}"`);
    assert(Buffer.from(dbRecord!.data).equals(SAMPLE_PNG_BUFFER), 'PostgreSQL MediaAsset.data contains exact binary bytes');

    // Locate disk file and DELETE it to simulate Render disk wipe/restart
    const diskPath = path.resolve(process.cwd(), 'uploads', pngResult.key.replace(/\//g, path.sep));
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
      console.log(`  Simulated disk wipe: deleted ${diskPath}`);
    }
    assert(!fs.existsSync(diskPath), 'Local disk file is confirmed deleted');

    // Fetch via storageProvider - it MUST retrieve from PostgreSQL and auto-heal the disk cache
    const rehydrated = await storageProvider.getMediaAsset(pngResult.key);
    assert(Boolean(rehydrated), 'Successfully retrieved media asset after disk cache deletion');
    assert(rehydrated!.buffer.equals(SAMPLE_PNG_BUFFER), 'Rehydrated buffer matches original PNG binary');
    assert(rehydrated!.mimeType === 'image/png', 'Rehydrated MIME type is image/png');

    // Verify lookup by UUID id as well
    const rehydratedById = await storageProvider.getMediaAsset(pngResult.id);
    assert(Boolean(rehydratedById), 'Successfully retrieved media asset by UUID id');
    assert(rehydratedById!.buffer.equals(SAMPLE_PNG_BUFFER), 'Buffer retrieved by UUID id matches exactly');

    // Give auto-healing async disk write a moment to flush
    await new Promise((r) => setTimeout(r, 200));
    assert(fs.existsSync(diskPath), 'Local disk cache was auto-healed from PostgreSQL');

    // -------------------------------------------------------------------------
    // TEST 4: HTTP Media Streaming Endpoints & Headers (Requirement 4, 12, 13)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Testing HTTP Media Streaming Endpoints via Express app...');
    const app = createApp();

    // Start ephemeral local server to test real HTTP requests
    const server = await new Promise<any>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const port = server.address().port;
    const baseHttpUrl = `http://127.0.0.1:${port}`;

    try {
      // Test GET /api/v1/media/:key
      const httpRes = await fetch(`${baseHttpUrl}/api/v1/media/${pngResult.key}`);
      assert(httpRes.status === 200, `GET /api/v1/media/${pngResult.key} returned HTTP 200`);
      assert(
        httpRes.headers.get('content-type') === 'image/png',
        `Response Content-Type is "${httpRes.headers.get('content-type')}"`
      );
      assert(
        httpRes.headers.get('content-length') === String(SAMPLE_PNG_BUFFER.length),
        `Response Content-Length matches buffer length (${SAMPLE_PNG_BUFFER.length} bytes)`
      );
      const httpBlob = Buffer.from(await httpRes.arrayBuffer());
      assert(httpBlob.equals(SAMPLE_PNG_BUFFER), 'Streamed binary bytes match original image byte-for-byte');

      // Test GET /api/v1/media/:id (by UUID)
      const httpResById = await fetch(`${baseHttpUrl}/api/v1/media/${pngResult.id}`);
      assert(httpResById.status === 200, `GET /api/v1/media/:id returned HTTP 200`);
      assert(httpResById.headers.get('content-type') === 'image/png', 'UUID lookup returned correct image/png Content-Type');

      // Test GET /uploads/:key (through static + fallback)
      const httpResUploads = await fetch(`${baseHttpUrl}/uploads/${pngResult.key}`);
      assert(httpResUploads.status === 200, `GET /uploads/${pngResult.key} returned HTTP 200`);

      // Test Non-existent media returns 404
      const http404 = await fetch(`${baseHttpUrl}/api/v1/media/non_existent_random_key_12345.png`);
      assert(http404.status === 404, 'Missing media returns HTTP 404 (not HTML/JSON fallback)');
    } finally {
      server.close();
    }

    // -------------------------------------------------------------------------
    // TEST 5: Business Logo & User DP Flow (Requirement 7 & 8)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Testing Business Logo & User DP persistence...');
    // Find an existing real user and business without deleting them
    const existingUser = await prisma.user.findFirst({
      include: { businesses: true },
    });

    if (existingUser) {
      console.log(`  Using existing user ${existingUser.name} (${existingUser.mobile}) for test.`);

      // Update user profileImage
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { profileImage: webpResult.url },
      });
      assert(updatedUser.profileImage === webpResult.url, `User.profileImage stored stable media URL: ${updatedUser.profileImage}`);

      // If business exists, update logoUrl
      if (existingUser.businesses.length > 0) {
        const biz = existingUser.businesses[0];
        const updatedBiz = await prisma.business.update({
          where: { id: biz.id },
          data: { logoUrl: pngResult.url },
        });
        assert(updatedBiz.logoUrl === pngResult.url, `Business.logoUrl stored stable media URL: ${updatedBiz.logoUrl}`);
      }
    } else {
      console.log('  No users in test environment; skipping relation test.');
    }

    // -------------------------------------------------------------------------
    // TEST 6: Morning Daily Content Flow (Requirement 6)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] Testing Daily Morning Content with media asset...');
    const testDailyContent = await prisma.dailyContent.create({
      data: {
        title: 'Morning Test Poster',
        headline: 'शुभ प्रभात टेस्ट',
        quoteHindi: 'सफलता का रहस्य निरंतर प्रयास है।',
        imageUrl: jpegResult.url,
        thumbnailUrl: jpegResult.url,
        contentType: 'SUVICHAR',
        language: 'hi',
        aspectRatio: '9:16',
        date: '2026-10-07',
        contentDate: new Date('2026-10-07T00:00:00Z'),
        tier: 'FREE',
        status: 'ACTIVE',
        isPublished: true,
        createdBy: 'test_admin@brandx.in',
      },
    });
    assert(testDailyContent.imageUrl === jpegResult.url, `DailyContent created with stable media URL: ${testDailyContent.imageUrl}`);

    // Verify retrieving it
    const fetchedDaily = await prisma.dailyContent.findUnique({
      where: { id: testDailyContent.id },
    });
    assert(Boolean(fetchedDaily), 'DailyContent retrieved successfully');
    assert(fetchedDaily!.imageUrl === jpegResult.url, 'Retrieved DailyContent retains exact media reference');

    // Cleanup the single test DailyContent record
    await prisma.dailyContent.delete({
      where: { id: testDailyContent.id },
    });
    console.log('  Cleaned up test DailyContent record safely.');

    // Cleanup the 3 test media records from DB and disk
    for (const key of createdMediaKeys) {
      await prisma.mediaAsset.deleteMany({ where: { key } });
      const p = path.resolve(process.cwd(), 'uploads', key.replace(/\//g, path.sep));
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch {}
      }
    }
    console.log('  Cleaned up test MediaAsset records.');

  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n========================================================================');
  console.log(` AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runMediaPipelineTests();
