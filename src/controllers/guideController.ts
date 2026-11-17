import { Request, Response, NextFunction } from 'express';
import guideService from '../services/guideService';
import { successResponse, errorResponse } from '../utils/responseHelper';

/**
 * Controller untuk Panduan Berkemah & Kontak Darurat (Skinny Controller)
 * Menangani HTTP Request/Response dan mendelegasikan logika ke GuideService
 */
export const guideController = {
  // GET /api/guides (Public)
  getGuidesData: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const data = await guideService.getGuidesData(req);
      return successResponse(res, 'Data panduan berkemah berhasil diambil.', data);
    } catch (error: any) {
      console.error('[Guide Error]', error);
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal mengambil data panduan.', statusCode);
    }
  },

  // --- CRUD RULES & WARNINGS ---
  createRule: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const newRule = await guideService.createRule(req.body);
      return successResponse(res, 'Aturan/panduan berhasil ditambahkan.', newRule, 201);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal menambahkan aturan.', statusCode);
    }
  },

  updateRule: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const id = req.params.id as string;
      const updated = await guideService.updateRule(id, req.body);
      return successResponse(res, 'Aturan/panduan berhasil diperbarui.', updated);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal memperbarui aturan.', statusCode);
    }
  },

  deleteRule: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const id = req.params.id as string;
      const existing = await guideService.deleteRule(id);
      return successResponse(res, `Aturan '${existing.title}' berhasil dihapus.`);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal menghapus aturan.', statusCode);
    }
  },

  // --- CRUD EMERGENCY CONTACTS ---
  createContact: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const newContact = await guideService.createContact(req.body);
      return successResponse(res, 'Kontak darurat berhasil ditambahkan.', newContact, 201);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal menambahkan kontak darurat.', statusCode);
    }
  },

  updateContact: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const id = req.params.id as string;
      const updated = await guideService.updateContact(id, req.body);
      return successResponse(res, 'Kontak darurat berhasil diperbarui.', updated);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal memperbarui kontak darurat.', statusCode);
    }
  },

  deleteContact: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const id = req.params.id as string;
      const existing = await guideService.deleteContact(id);
      return successResponse(res, `Kontak '${existing.title}' berhasil dihapus.`);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal menghapus kontak darurat.', statusCode);
    }
  }
};

export default guideController;
