import { Request, Response } from 'express';
import { userService } from '../services/userService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class UserController {
  async getMe(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.getProfile(req.user!.id);
      sendSuccess(res, user, 'Profile retrieved');
    } catch (error: any) {
      sendError(res, error.message, 404, 'USER_NOT_FOUND');
    }
  }

  async updateMe(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.updateProfile(req.user!.id, req.body);
      sendSuccess(res, user, 'Profile updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400, 'UPDATE_FAILED');
    }
  }
}

export const userController = new UserController();
