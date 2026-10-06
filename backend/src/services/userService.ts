import { userRepository } from '../repositories/userRepository.js';
import { businessRepository } from '../repositories/businessRepository.js';

export class UserService {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    const businesses = await businessRepository.findByOwnerId(userId);

    return {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      profileImage: user.profileImage,
      language: user.language,
      timezone: user.timezone,
      isPro: user.isPro,
      status: user.status,
      businesses,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, data: { name?: string; email?: string; language?: string; profileImage?: string }) {
    const updated = await userRepository.update(userId, {
      name: data.name,
      email: data.email || undefined,
      language: data.language,
      profileImage: data.profileImage !== undefined ? data.profileImage : undefined,
    });

    return {
      id: updated.id,
      name: updated.name,
      mobile: updated.mobile,
      email: updated.email,
      profileImage: updated.profileImage,
      language: updated.language,
      isPro: updated.isPro,
    };
  }
}

export const userService = new UserService();
