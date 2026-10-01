import { hashPassword, comparePassword } from '../src/utils/hash.js';
import { signAccessToken, verifyAccessToken, signAdminToken, verifyAdminToken } from '../src/utils/jwt.js';

export async function testAuthAndSecurity() {
  console.log('\n--- 🧪 Testing Authentication & Security Utilities ---');

  // Test 1: Password hashing and comparison
  const rawPass = 'SecretVyapari@2026';
  const hashed = await hashPassword(rawPass);

  const isMatch = await comparePassword(rawPass, hashed);
  if (!isMatch) {
    throw new Error('Password comparison failed for matching password');
  }

  const isMismatch = await comparePassword('WrongPassword', hashed);
  if (isMismatch) {
    throw new Error('Password comparison succeeded for wrong password');
  }
  console.log('✅ Password hashing & bcrypt verification confirmed.');

  // Test 2: User JWT signing & verification
  const userPayload = {
    userId: '11111111-2222-3333-4444-555555555555',
    mobile: '9820123456',
    email: 'rahul@brandx.in',
    name: 'Rahul Sharma',
  };

  const userToken = signAccessToken(userPayload);
  const decodedUser = verifyAccessToken(userToken);

  if (decodedUser.userId !== userPayload.userId || decodedUser.mobile !== userPayload.mobile) {
    throw new Error('User JWT decoded payload mismatch');
  }
  console.log('✅ User Access Token signing and verification confirmed.');

  // Test 3: Admin JWT signing & role verification
  const adminPayload = {
    adminId: 'admin-uuid-001',
    email: 'admin@brandx.in',
    name: 'Super Admin',
    role: 'SUPER_ADMIN',
  };

  const adminToken = signAdminToken(adminPayload);
  const decodedAdmin = verifyAdminToken(adminToken);

  if (decodedAdmin.adminId !== adminPayload.adminId || decodedAdmin.role !== 'SUPER_ADMIN') {
    throw new Error('Admin JWT decoded payload mismatch');
  }
  console.log('✅ Admin JWT signing and RBAC payload verified.');
}
