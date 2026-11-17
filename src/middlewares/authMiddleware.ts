import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import AdminModel from '../models/AdminModel';
import { errorResponse } from '../utils/responseHelper';

/**
 * Middleware untuk verifikasi token JWT admin
 * Menggunakan AdminModel (DAL) tanpa query SQL langsung
 */
export const authMiddleware = async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Akses ditolak. Token otentikasi tidak ditemukan.', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return errorResponse(res, 'Akses ditolak. Format token tidak valid.', 401);
    }

    const jwtSecret = process.env.JWT_SECRET || 'bedengan_xplore_secret_key_2026';
    let decoded: any;

    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return errorResponse(res, 'Sesi tidak valid atau token telah kedaluwarsa. Silakan login kembali.', 401);
    }

    const admin = await AdminModel.findById(decoded.id);

    if (!admin) {
      return errorResponse(res, 'Akun admin tidak ditemukan atau telah dinonaktifkan.', 401);
    }

    req.admin = admin;
    next();
  } catch (error: any) {
    return errorResponse(res, 'Terjadi kesalahan pada verifikasi autentikasi.', 500, error.message);
  }
};

export default authMiddleware;

