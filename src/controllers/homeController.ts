import { Request, Response, NextFunction } from 'express';
import ConfigModel from '../models/ConfigModel';
import GroundModel from '../models/GroundModel';
import CatalogModel from '../models/CatalogModel';
import ReviewModel from '../models/ReviewModel';
import { successResponse, errorResponse, formatImageUrl } from '../utils/responseHelper';
import { isEmpty, validateLength } from '../utils/validator';

/**
 * Controller untuk Halaman Beranda, Dashboard Statistik, Ulasan Pengunjung, & Pengaturan Situs
 * Akses database melalui Data Access Layer (ConfigModel, GroundModel, CatalogModel, ReviewModel)
 */
export const homeController = {
  // GET /api/home (Public)
  getHomeData: async (req: Request | any, res: Response, next?: NextFunction) => {
    try {
      // 1. Ambil site_configs
      const rawConfigs = await ConfigModel.getAll();
      const configs: Record<string, any> = {};
      Object.entries(rawConfigs).forEach(([key, val]) => {
        let formattedVal = val;
        if (key.includes('map_url') || key.includes('image')) {
          formattedVal = formatImageUrl(req, val as string);
        }
        configs[key] = formattedVal;
      });

      // 2. Ringkasan Statistik
      const totalGrounds = await GroundModel.countActive();
      const totalRentals = await CatalogModel.countByCategoryAndStatus('rental', 'approved');
      const totalWarungs = await CatalogModel.countByCategoryAndStatus('warung', 'approved');
      const totalPhotographers = await CatalogModel.countByCategoryAndStatus('photographer', 'approved');
      const totalPending = await CatalogModel.countPending();

      // 3. Ulasan Pengunjung
      const reviews = await ReviewModel.findPublished(10);

      return successResponse(res, 'Data beranda berhasil diambil.', {
        about_bedengan: configs.about_bedengan || 'Bumi Perkemahan Bedengan, Dau, Kabupaten Malang.',
        location: {
          latitude: parseFloat(configs.location_lat || '-7.934821'),
          longitude: parseFloat(configs.location_lng || '112.531205'),
          address: 'Jl. Raya Selorejo, Dusun Selokerto, Selorejo, Kec. Dau, Kabupaten Malang, Jawa Timur 65151'
        },
        fees: {
          camping_fee: configs.camping_fee || 'Rp 25.000 / orang / malam',
          park_fee: configs.park_fee || 'Motor: Rp 5.000 | Mobil: Rp 10.000'
        },
        summary: {
          total_grounds: totalGrounds,
          total_rentals: totalRentals,
          total_warungs: totalWarungs,
          total_photographers: totalPhotographers,
          pending_applications: totalPending
        },
        reviews,
        configs
      });
    } catch (error: any) {
      console.error('[Home Error]', error);
      return errorResponse(res, 'Gagal mengambil data beranda.', 500, error.message);
    }
  },

  // GET /api/home/dashboard (Protected - data lengkap untuk Next.js Admin Panel)
  getDashboardStats: async (req: Request | any, res: Response, next?: NextFunction) => {
    try {
      const totalGrounds = await GroundModel.countAll();
      const totalRentals = await CatalogModel.countByCategoryAndStatus('rental', 'approved');
      const totalWarungs = await CatalogModel.countByCategoryAndStatus('warung', 'approved');
      const totalPhotographers = await CatalogModel.countByCategoryAndStatus('photographer', 'approved');

      const pendingRows = await CatalogModel.findPending(10);
      const recentActivities = await CatalogModel.findRecentActivities(5);

      return successResponse(res, 'Data statistik dashboard berhasil diambil.', {
        total_warung: totalWarungs,
        total_rental: totalRentals,
        total_photographer: totalPhotographers,
        total_grounds: totalGrounds,
        pending_count: pendingRows.length,
        pending_registrations: pendingRows,
        recent_activities: recentActivities
      });
    } catch (error: any) {
      return errorResponse(res, 'Gagal mengambil data dashboard.', 500, error.message);
    }
  },

  // POST /api/home/reviews (Public/Admin)
  createReview: async (req: Request | any, res: Response, next?: NextFunction) => {
    try {
      const { visitor_name, rating, comment, visit_date } = req.body;

      if (isEmpty(visitor_name) || isEmpty(rating) || isEmpty(comment)) {
        return errorResponse(res, 'Nama pengunjung, rating (1-5), dan komentar wajib diisi!', 400);
      }

      const nameCheck = validateLength(visitor_name, 100, 'Nama pengunjung');
      if (!nameCheck.isValid) return errorResponse(res, nameCheck.error, 400);

      const parsedRating = parseInt(rating, 10);
      if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return errorResponse(res, 'Rating harus berupa angka 1 sampai 5.', 400);
      }

      const newReview = await ReviewModel.create({
        visitor_name: String(visitor_name).trim(),
        rating: parsedRating,
        comment: String(comment).trim(),
        visit_date: visit_date || 'Hari ini'
      });

      return successResponse(res, 'Terima kasih! Ulasan Anda berhasil dikirimkan.', newReview, 201);
    } catch (error: any) {
      return errorResponse(res, 'Gagal menambahkan ulasan.', 500, error.message);
    }
  },

  // DELETE /api/home/reviews/:id (Protected)
  deleteReview: async (req: Request | any, res: Response, next?: NextFunction) => {
    try {
      const { id } = req.params;

      const existing = await ReviewModel.findById(id);
      if (!existing) {
        return errorResponse(res, 'Ulasan tidak ditemukan.', 404);
      }

      await ReviewModel.delete(id);

      return successResponse(res, 'Ulasan berhasil dihapus.');
    } catch (error: any) {
      return errorResponse(res, 'Gagal menghapus ulasan.', 500, error.message);
    }
  },

  // PUT /api/home/configs (Protected)
  updateConfigs: async (req: Request | any, res: Response, next?: NextFunction) => {
    try {
      const updates = req.body;

      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        return errorResponse(res, 'Payload konfigurasi tidak valid.', 400);
      }

      const updatedConfigs = await ConfigModel.upsertMany(updates);

      const formattedConfigs: Record<string, any> = {};
      Object.entries(updatedConfigs).forEach(([key, val]) => {
        let formattedVal = val;
        if (key.includes('map_url') || key.includes('image')) {
          formattedVal = formatImageUrl(req, val as string);
        }
        formattedConfigs[key] = formattedVal;
      });

      return successResponse(res, 'Konfigurasi situs berhasil diperbarui.', formattedConfigs);
    } catch (error: any) {
      console.error('[Config Error]', error);
      return errorResponse(res, 'Gagal memperbarui konfigurasi.', 500, error.message);
    }
  },

  // POST /api/home/configs/upload-map (Protected + Multer)
  uploadMapImage: async (req: Request | any, res: Response, next?: NextFunction) => {
    try {
      if (!req.file) {
        return errorResponse(res, 'File gambar peta wajib diunggah!', 400);
      }

      const { map_type } = req.body;
      const relativePath = `/uploads/maps/${req.file.filename}`;
      const configKey = map_type === 'evacuation' ? 'evacuation_map_url' : 'overall_ground_map_url';

      await ConfigModel.upsert(configKey, relativePath);

      return successResponse(res, 'Gambar peta berhasil diperbarui.', {
        config_key: configKey,
        relative_path: relativePath,
        full_url: formatImageUrl(req, relativePath)
      });
    } catch (error: any) {
      return errorResponse(res, 'Gagal mengunggah gambar peta.', 500, error.message);
    }
  }
};

export default homeController;

