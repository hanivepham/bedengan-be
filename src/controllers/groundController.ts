import { Request, Response, NextFunction } from 'express';
import groundService from '../services/groundService';
import { successResponse, errorResponse } from '../utils/responseHelper';

/**
 * Controller untuk Manajemen Zona Perkemahan (Skinny Controller)
 * Menangani HTTP Request/Response dan mendelegasikan logika ke GroundService
 */
export const groundController = {
  // GET /api/grounds (Public)
  getAllGrounds: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const data = await groundService.getAllGrounds(req);
      return successResponse(res, 'Daftar seluruh zona ground berhasil diambil.', data);
    } catch (error: any) {
      console.error('[Grounds Error]', error);
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal mengambil data zona perkemahan.', statusCode);
    }
  },

  // GET /api/grounds/:code (Public)
  getGroundDetail: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const code = req.params.code as string;
      const data = await groundService.getGroundDetail(req, code);
      return successResponse(res, 'Detail ground berhasil diambil.', data);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal mengambil detail ground.', statusCode);
    }
  },

  // POST /api/grounds (Protected + Multer)
  createGround: async (req: Request | any, res: Response, next?: NextFunction) => {
    try {
      const newGround = await groundService.createGround(req, req.body, req.file);
      return successResponse(
        res,
        'Zona perkemahan baru berhasil ditambahkan.',
        newGround,
        201
      );
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal menambahkan data zona perkemahan.', statusCode);
    }
  },

  // PUT /api/grounds/:id (Protected + Multer)
  updateGround: async (req: Request | any, res: Response, next?: NextFunction) => {
    try {
      const id = req.params.id as string;
      const updatedGround = await groundService.updateGround(req, id, req.body, req.file);
      return successResponse(
        res,
        `Data zona ground '${updatedGround?.name}' berhasil diperbarui.`,
        updatedGround
      );
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal memperbarui data ground.', statusCode);
    }
  },

  // DELETE /api/grounds/:id (Protected)
  deleteGround: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const id = req.params.id as string;
      const oldGround = await groundService.deleteGround(id);
      return successResponse(res, `Ground '${oldGround.name}' (${oldGround.code}) berhasil dihapus.`);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal menghapus ground.', statusCode);
    }
  }
};

export default groundController;
