import { Request, Response, NextFunction } from 'express';
import catalogService, { extractCatalogPayload } from '../services/catalogService';
import { successResponse, errorResponse } from '../utils/responseHelper';
import { AuthRequest } from '../types';

/**
 * Controller untuk Katalog Layanan & Fasilitas Bedengan Xplore (Skinny Controller)
 * Menangani HTTP Request/Response dan mendelegasikan logika ke CatalogService
 */
export const catalogController = {
  // GET /api/catalogs (Public)
  getAllCatalogs: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const { category, search, status } = req.query;
      const catalogs = await catalogService.getAllCatalogs(req, {
        category: category as string,
        search: search as string,
        status: status as string
      });

      return successResponse(res, 'Data katalog berhasil diambil.', catalogs);
    } catch (error: any) {
      console.error('[Catalogs Error]', error);
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal mengambil data katalog.', statusCode);
    }
  },

  // GET /api/catalogs/:id (Public)
  getCatalogDetail: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const id = req.params.id as string;
      const item = await catalogService.getCatalogDetail(req, id);
      return successResponse(res, 'Detail katalog berhasil diambil.', item);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal mengambil detail katalog.', statusCode);
    }
  },

  // POST /api/catalogs (Admin & Public Apply)
  createCatalog: async (req: AuthRequest | any, res: Response, next?: NextFunction) => {
    try {
      const payload = extractCatalogPayload(req);
      const isAdmin = Boolean(req.admin);
      const files = req.files || (req.file ? { image: [req.file] } : undefined);
      const newItem = await catalogService.createCatalog(req, payload, files, isAdmin);

      const message = isAdmin
        ? 'Data katalog berhasil ditambahkan.'
        : 'Pengajuan katalog Anda berhasil dikirim! Menunggu persetujuan admin pengelola Bedengan.';

      return successResponse(res, message, newItem, 201);
    } catch (error: any) {
      console.error('[Create Catalog Error]', error);
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal menyimpan data katalog.', statusCode);
    }
  },

  // PUT /api/catalogs/:id (Protected + Multer)
  updateCatalog: async (req: Request | any, res: Response, next?: NextFunction) => {
    try {
      const id = req.params.id as string;
      const payload = extractCatalogPayload(req);
      const files = req.files || (req.file ? { image: [req.file] } : undefined);
      const updated = await catalogService.updateCatalog(req, id, payload, files);

      return successResponse(res, 'Data katalog berhasil diperbarui.', updated);
    } catch (error: any) {
      console.error('[Update Catalog Error]', error);
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal memperbarui data katalog.', statusCode);
    }
  },

  // DELETE /api/catalogs/:id (Protected)
  deleteCatalog: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const id = req.params.id as string;
      const existing = await catalogService.deleteCatalog(id);
      return successResponse(res, `Katalog '${existing.name}' berhasil dihapus.`);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal menghapus katalog.', statusCode);
    }
  }
};

export default catalogController;
