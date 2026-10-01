import { prisma } from '../config/database.js';
import { User, Prisma } from '@prisma/client';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    if (!id || typeof id !== 'string' || !id.trim()) return null;
    return prisma.user.findUnique({ where: { id: id.trim() } });
  }

  async findByMobile(mobile: string): Promise<User | null> {
    if (!mobile || typeof mobile !== 'string' || !mobile.trim()) return null;
    return prisma.user.findUnique({ where: { mobile: mobile.trim() } });
  }

  async findByEmail(email: string): Promise<User | null> {
    if (!email || typeof email !== 'string' || !email.trim()) return null;
    return prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  }

  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    if (!firebaseUid || typeof firebaseUid !== 'string' || !firebaseUid.trim()) {
      return null;
    }
    return prisma.user.findUnique({ where: { firebaseUid: firebaseUid.trim() } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<User> {
    return prisma.user.delete({ where: { id } });
  }

  async list(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }): Promise<{ users: User[]; total: number }> {
    const { page, limit, search, status } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (status && status !== 'all') {
      where.status = status.toUpperCase() as any;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }
}

export const userRepository = new UserRepository();
