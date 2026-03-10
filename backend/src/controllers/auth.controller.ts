import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationName, organizationSlug, email, password, firstName, lastName, phone, planId } =
        req.body;

      const result = await authService.register({
        organizationName,
        organizationSlug,
        email,
        password,
        firstName,
        lastName,
        phone,
        planId,
      });

      ApiResponse.created(res, 'Registration successful', result);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const result = await authService.login({ email, password });

      ApiResponse.success(res, 'Login successful', result);
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      const tokens = await authService.refreshTokens(refreshToken);

      ApiResponse.success(res, 'Tokens refreshed successfully', tokens);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await authService.logout(req.user.id);
      }

      ApiResponse.success(res, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      await authService.forgotPassword(email);

      ApiResponse.success(res, 'If an account exists, a password reset email has been sent');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body;

      await authService.resetPassword(token, password);

      ApiResponse.success(res, 'Password reset successful');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!req.user) {
        ApiResponse.unauthorized(res);
        return;
      }

      await authService.changePassword(req.user.id, currentPassword, newPassword);

      ApiResponse.success(res, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        ApiResponse.unauthorized(res);
        return;
      }

      ApiResponse.success(res, 'User profile retrieved', req.user);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
