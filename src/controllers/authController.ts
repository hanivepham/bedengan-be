import { Request, Response, NextFunction } from 'express';
import authService from '../services/authService';
import { successResponse, errorResponse } from '../utils/responseHelper';
import { AuthRequest } from '../types';

/**
 * Controller untuk Autentikasi Admin (Skinny Controller)
 * Menangani HTTP Request/Response dan mendelegasikan logika ke AuthService
 */
export const authController = {
  // POST /api/auth/login
  login: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });
      return successResponse(res, 'Login berhasil. Selamat datang di Panel Admin Bedengan Xplore!', result);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Terjadi kesalahan pada server saat login.', statusCode);
    }
  },

  // GET /api/auth/me (Protected)
  getMe: async (req: AuthRequest | any, res: Response, next?: NextFunction) => {
    try {
      const adminId = req.admin?.id;
      const result = await authService.getMe(adminId);
      return successResponse(res, 'Data profil admin berhasil diambil.', result);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal mengambil data profil admin.', statusCode);
    }
  },

  // PUT /api/auth/profile (Protected)
  updateProfile: async (req: AuthRequest | any, res: Response, next?: NextFunction) => {
    try {
      const adminId = req.admin?.id;
      const { name, email, currentPassword, newPassword } = req.body;
      const result = await authService.updateProfile(adminId, {
        name,
        email,
        currentPassword,
        newPassword
      });

      return successResponse(res, 'Profil admin berhasil diperbarui.', { admin: result });
    } catch (error: any) {
      console.error('[Update Profile Error]', error);
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal memperbarui profil.', statusCode);
    }
  }
};

export default authController;
