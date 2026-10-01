/**
 * BRANDX — Authentication Service (JWT & Firebase Authentication with PostgreSQL)
 */
import crypto, { randomUUID } from 'crypto';
import { userRepository } from '../repositories/userRepository.js';
import { businessRepository } from '../repositories/businessRepository.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { prisma } from '../config/database.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { verifyFirebaseIdToken } from '../config/firebaseAdmin.js';
import { referralService } from './referralService.js';

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface RegisterInput {
  name: string;
  mobile: string;
  email?: string;
  password?: string;
  businessName?: string;
  businessCategory?: string;
  referralCode?: string;
}

export class AuthService {
  async register(input: RegisterInput, ip?: string, userAgent?: string) {
    const existing = await userRepository.findByMobile(input.mobile);
    if (existing) {
      throw new Error('An account with this mobile number already exists');
    }

    const passwordHash = input.password ? await hashPassword(input.password) : null;

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: input.name,
          mobile: input.mobile,
          email: input.email || null,
          passwordHash,
          language: 'hi',
          phoneVerified: true,
          emailVerified: Boolean(input.email),
        },
      });

      // Create initial primary business for new vyapari
      const bizName = input.businessName || (input.name ? `${input.name}'s Shop` : 'My Business');
      await tx.business.create({
        data: {
          ownerId: newUser.id,
          name: bizName,
          ownerName: input.name || '',
          mobile: input.mobile,
          email: input.email || null,
          category: input.businessCategory || 'Retail & Kirana',
          address: '',
          city: '',
          state: '',
          pincode: '',
          settings: {
            create: {
              autoShareWhatsapp: true,
              showGstOnBill: true,
              defaultGstRate: 18.0,
            },
          },
        },
      });

      return newUser;
    });

    // Handle referral attachment and reward eligibility if referral code provided
    if (input.referralCode) {
      try {
        await referralService.registerReferral(input.referralCode, user.id);
        await referralService.processEligibility(user.id);
      } catch (refErr: any) {
        console.warn('[AuthService] Referral registration notice:', refErr.message);
      }
    }

    const accessToken = signAccessToken({
      userId: user.id,
      mobile: user.mobile || '',
      email: user.email,
      name: user.name,
    });

    const sessionId = randomUUID();
    const refreshToken = signRefreshToken({ userId: user.id, sessionId });

    // Store active session with cryptographic SHA-256 fingerprint
    await prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: hashRefreshToken(refreshToken),
        userAgent,
        ipAddress: ip,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isRevoked: false,
      },
    });

    await auditRepository.log({
      actorId: user.id,
      action: 'USER_REGISTER',
      entity: 'User',
      entityId: user.id,
      ipAddress: ip,
      userAgent,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile || '',
        email: user.email,
        isPro: user.isPro,
        phoneVerified: (user as any).phoneVerified ?? true,
        emailVerified: (user as any).emailVerified ?? false,
        language: user.language,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: '7d',
      },
    };
  }

  async login(identifier: string, password?: string, ip?: string, userAgent?: string) {
    const isMobile = /^\d{10}$/.test(identifier);
    const user = isMobile
      ? await userRepository.findByMobile(identifier)
      : await userRepository.findByEmail(identifier);

    if (!user) {
      throw new Error('No user account found with this credential');
    }

    if (password && user.passwordHash) {
      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) {
        throw new Error('Invalid password provided');
      }
    }

    const accessToken = signAccessToken({
      userId: user.id,
      mobile: user.mobile || '',
      email: user.email,
      name: user.name,
    });

    const sessionId = randomUUID();
    const refreshToken = signRefreshToken({ userId: user.id, sessionId });

    await prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: hashRefreshToken(refreshToken),
        userAgent,
        ipAddress: ip,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isRevoked: false,
      },
    });

    const businesses = await businessRepository.findByOwnerId(user.id);

    await auditRepository.log({
      actorId: user.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress: ip,
      userAgent,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile || '',
        email: user.email,
        isPro: user.isPro,
        phoneVerified: (user as any).phoneVerified ?? false,
        emailVerified: (user as any).emailVerified ?? false,
        language: user.language,
      },
      primaryBusiness: businesses[0] || null,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: '7d',
      },
    };
  }

  async refreshToken(token: string) {
    if (!token || typeof token !== 'string') {
      throw new Error('Refresh token is required');
    }

    let decoded: { userId: string; sessionId?: string };
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      throw new Error('Invalid or expired refresh token');
    }

    if (!decoded?.userId) {
      throw new Error('Invalid refresh token payload');
    }

    const tokenHash = hashRefreshToken(token);

    // Authoritative server-side session verification from PostgreSQL
    let session = decoded.sessionId
      ? await prisma.userSession.findUnique({ where: { id: decoded.sessionId } })
      : null;

    if (!session) {
      // Fallback lookup by token hash for backward compatibility with legacy sessions
      session = await prisma.userSession.findFirst({
        where: {
          OR: [
            { refreshTokenHash: tokenHash },
            { refreshTokenHash: token.substring(0, 40) },
          ],
        },
      });
    }

    if (!session) {
      throw new Error('Session has been revoked or expired upon logout');
    }

    if (session.isRevoked) {
      throw new Error('Session has been revoked');
    }

    if (new Date() > new Date(session.expiresAt)) {
      throw new Error('Session has expired');
    }

    if (session.userId !== decoded.userId) {
      throw new Error('Session user mismatch');
    }

    // Verify token fingerprint / rotation binding
    const isHashMatch =
      session.refreshTokenHash === tokenHash ||
      session.refreshTokenHash === token.substring(0, 40);

    if (!isHashMatch) {
      throw new Error('Refresh token fingerprint mismatch or already rotated');
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.status === 'SUSPENDED') {
      throw new Error('Account suspended');
    }

    // Rotate refresh token and update session fingerprint
    const newRefreshToken = signRefreshToken({ userId: user.id, sessionId: session.id });
    const newHash = hashRefreshToken(newRefreshToken);

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newHash,
        updatedAt: new Date(),
      },
    });

    const newAccessToken = signAccessToken({
      userId: user.id,
      mobile: user.mobile || '',
      email: user.email,
      name: user.name,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: '7d',
    };
  }

  /**
   * Authenticate or register a BrandX User using a verified Firebase ID token.
   * Enforces multi-tenant security, duplicate account protection, and PostgreSQL data persistence.
   */
  async authenticateWithFirebase(
    idToken: string,
    profileData?: {
      businessName?: string;
      category?: string;
      name?: string;
      mobile?: string;
      email?: string;
      phoneVerified?: boolean;
      emailVerified?: boolean;
      referralCode?: string;
    },
    ip?: string,
    userAgent?: string
  ) {
    const decoded = await verifyFirebaseIdToken(idToken);
    const firebaseUid = decoded.uid;

    if (!firebaseUid) {
      throw new Error('Invalid Firebase token: UID is missing.');
    }

    // Helper to normalize phone number to 10 digits
    const rawPhone = decoded.phone_number;
    let normalizedPhone: string | null = null;
    if (rawPhone) {
      const digits = rawPhone.replace(/\D/g, '');
      normalizedPhone = digits.length > 10 ? digits.slice(-10) : digits;
    } else if (profileData?.mobile) {
      const digits = profileData.mobile.replace(/\D/g, '');
      normalizedPhone = digits.length > 10 ? digits.slice(-10) : digits;
    }

    const email = decoded.email ? decoded.email.trim().toLowerCase() : (profileData?.email ? profileData.email.trim().toLowerCase() : null);
    const isEmailVerified = Boolean(
      decoded.email_verified || (decoded.email && (decoded.firebase?.sign_in_provider === 'password' || decoded.firebase?.sign_in_provider === 'google.com')) || (Boolean(email) && Boolean(profileData?.emailVerified))
    );
    const isPhoneVerified = Boolean(rawPhone || (normalizedPhone && (profileData?.phoneVerified || profileData?.mobile)));

    let isNewUser = false;
    let user = await userRepository.findByFirebaseUid(firebaseUid);

    if (user) {
      const updates: any = {};
      if (email && !user.email) {
        updates.email = email;
        updates.emailVerified = isEmailVerified;
      }
      if (normalizedPhone && !user.mobile) {
        updates.mobile = normalizedPhone;
        updates.phoneVerified = isPhoneVerified;
      }
      if (isPhoneVerified && !(user as any).phoneVerified) {
        updates.phoneVerified = true;
      }
      if (isEmailVerified && !(user as any).emailVerified) {
        updates.emailVerified = true;
      }
      if (Object.keys(updates).length > 0) {
        user = await (prisma.user as any).update({
          where: { id: user.id },
          data: updates,
        });
      }
    } else {
      // Check if user exists by verified phone or email
      let existingUser = null;
      if (normalizedPhone) {
        existingUser = await userRepository.findByMobile(normalizedPhone);
      }
      if (!existingUser && email) {
        existingUser = await userRepository.findByEmail(email);
      }

      if (existingUser) {
        // Account duplication protection: if account is already mapped to a DIFFERENT Firebase UID, reject conflict
        const existingFirebaseUid = (existingUser as any).firebaseUid;
        if (existingFirebaseUid && existingFirebaseUid !== firebaseUid) {
          throw new Error('ACCOUNT_CONFLICT: This phone number or email is already linked to another Firebase account.');
        }

        // Link Firebase UID to existing account safely
        const updateData: any = {
          firebaseUid,
          profileImage: existingUser.profileImage || decoded.picture || null,
        };
        if (email && !existingUser.email) {
          updateData.email = email;
        }
        if (normalizedPhone && !existingUser.mobile) {
          updateData.mobile = normalizedPhone;
        }
        if (isPhoneVerified && !(existingUser as any).phoneVerified) {
          updateData.phoneVerified = true;
        }
        if (isEmailVerified && !(existingUser as any).emailVerified) {
          updateData.emailVerified = true;
        }
        user = await (prisma.user as any).update({
          where: { id: existingUser.id },
          data: updateData,
        });
      } else {
        // Brand new user registration in PostgreSQL
        user = await prisma.$transaction(async (tx) => {
          const resolvedName =
            profileData?.name?.trim() ||
            decoded.name?.trim() ||
            (email ? email.split('@')[0] : '');

          const newUser = await (tx.user as any).create({
            data: {
              firebaseUid,
              name: resolvedName,
              mobile: normalizedPhone || undefined,
              email,
              phoneVerified: isPhoneVerified,
              emailVerified: isEmailVerified,
              profileImage: decoded.picture || null,
              language: 'hi',
              status: 'ACTIVE',
            },
          });

          // Create primary business for new vyapari if requested or default clean profile
          const bizName = profileData?.businessName?.trim() || (resolvedName ? `${resolvedName}'s Shop` : '');
          await tx.business.create({
            data: {
              ownerId: newUser.id,
              name: bizName,
              ownerName: resolvedName,
              mobile: normalizedPhone || '',
              email,
              category: profileData?.category?.trim() || 'Retail & Kirana',
              address: '',
              city: '',
              state: '',
              pincode: '',
              settings: {
                create: {
                  autoShareWhatsapp: true,
                  showGstOnBill: true,
                  defaultGstRate: 18.0,
                },
              },
            },
          });

          return newUser;
        });
        isNewUser = true;
      }
    }

    if (!user) {
      throw new Error('Authentication failed: Unable to resolve user account.');
    }

    if (isNewUser && profileData?.referralCode) {
      try {
        await referralService.registerReferral(profileData.referralCode, user.id);
        await referralService.processEligibility(user.id);
      } catch (refErr: any) {
        console.warn('[AuthService] Firebase referral registration notice:', refErr.message);
      }
    }

    if (user.status === 'SUSPENDED') {
      throw new Error('Your account has been suspended. Please contact BrandX support.');
    }

    const accessToken = signAccessToken({
      userId: user.id,
      mobile: user.mobile || '',
      email: user.email || '',
      name: user.name,
    });

    const sessionId = randomUUID();
    const refreshToken = signRefreshToken({ userId: user.id, sessionId });

    // Store active session with cryptographic SHA-256 fingerprint
    await prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: hashRefreshToken(refreshToken),
        userAgent,
        ipAddress: ip,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isRevoked: false,
      },
    });

    const businesses = await businessRepository.findByOwnerId(user.id);

    await auditRepository.log({
      actorId: user.id,
      action: isNewUser ? 'USER_FIREBASE_REGISTER' : 'USER_FIREBASE_LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress: ip,
      userAgent,
      metadata: {
        firebaseUid,
        authTime: decoded.auth_time,
      },
    });

    return {
      user: {
        id: user.id,
        firebaseUid: (user as any).firebaseUid || firebaseUid,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        isPro: user.isPro,
        phoneVerified: (user as any).phoneVerified ?? isPhoneVerified,
        emailVerified: (user as any).emailVerified ?? isEmailVerified,
        language: user.language,
        profileImage: user.profileImage,
      },
      primaryBusiness: businesses[0] || null,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: '7d',
      },
      isNewUser,
    };
  }

  /**
   * Invalidate user session / refresh token on logout
   */
  async logout(refreshToken?: string, userId?: string): Promise<{ success: boolean; message: string }> {
    if (refreshToken && typeof refreshToken === 'string') {
      let sessionId: string | undefined;
      try {
        const decoded = verifyRefreshToken(refreshToken);
        sessionId = decoded?.sessionId;
      } catch {
        // Token might already be expired, but we still delete by hash
      }

      const tokenHash = hashRefreshToken(refreshToken);
      const prefix40 = refreshToken.substring(0, 40);

      const conditions: any[] = [
        { refreshTokenHash: tokenHash },
        { refreshTokenHash: prefix40 },
      ];
      if (sessionId) {
        conditions.push({ id: sessionId });
      }

      await prisma.userSession.deleteMany({
        where: { OR: conditions },
      });
    } else if (userId) {
      await prisma.userSession.deleteMany({
        where: { userId },
      });
    }
    return { success: true, message: 'Logged out successfully' };
  }
}

export const authService = new AuthService();
