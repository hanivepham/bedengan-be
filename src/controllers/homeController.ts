import { Request, Response, NextFunction } from 'express';
import homeService from '../services/homeService';
import { successResponse, errorResponse } from '../utils/responseHelper';

/**
 * Controller untuk Halaman Beranda, Dashboard Statistik, & Pengaturan (Skinny Controller)
 * Menangani HTTP Request/Response dan mendelegasikan logika ke HomeService
 */
export const homeController = {
  // GET /api/home (Public)
  getHomeData: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const data = await homeService.getHomeData(req);
      return successResponse(res, 'Data beranda berhasil diambil.', data);
    } catch (error: any) {
      console.error('[Home Error]', error);
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal mengambil data beranda.', statusCode);
    }
  },

  // GET /api/home/dashboard (Protected)
  getDashboardStats: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const data = await homeService.getDashboardStats();
      return successResponse(res, 'Data statistik dashboard berhasil diambil.', data);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal mengambil data dashboard.', statusCode);
    }
  },

  // POST /api/home/reviews (Public/Admin)
  createReview: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const newReview = await homeService.createReview(req.body);
      return successResponse(res, 'Terima kasih! Ulasan Anda berhasil dikirimkan.', newReview, 201);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal menambahkan ulasan.', statusCode);
    }
  },

  // DELETE /api/home/reviews/:id (Protected)
  deleteReview: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const id = req.params.id as string;
      await homeService.deleteReview(id);
      return successResponse(res, 'Ulasan berhasil dihapus.');
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal menghapus ulasan.', statusCode);
    }
  },

  // PUT /api/home/configs (Protected)
  updateConfigs: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const formattedConfigs = await homeService.updateConfigs(req, req.body);
      return successResponse(res, 'Konfigurasi situs berhasil diperbarui.', formattedConfigs);
    } catch (error: any) {
      console.error('[Config Error]', error);
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal memperbarui konfigurasi.', statusCode);
    }
  },

  // POST /api/home/configs/upload-map (Protected + Multer)
  uploadMapImage: async (req: Request | any, res: Response, next?: NextFunction) => {
    try {
      const result = await homeService.uploadMapImage(req, req.file, req.body?.map_type);
      return successResponse(res, 'Gambar peta berhasil diperbarui.', result);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal mengunggah gambar peta.', statusCode);
    }
  }
};

export default homeController;
