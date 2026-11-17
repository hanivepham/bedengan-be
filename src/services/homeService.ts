import { Request } from 'express';
import ConfigModel from '../models/ConfigModel';
import GroundModel from '../models/GroundModel';
import CatalogModel from '../models/CatalogModel';
import ReviewModel from '../models/ReviewModel';
import { formatImageUrl } from '../utils/responseHelper';
import { isEmpty, validateLength } from '../utils/validator';
import { CreateReviewDTO } from '../types';

export class HomeServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const homeService = {
  /**
   * Mengambil data halaman beranda publik
   */
  getHomeData: async (req: Request | any) => {
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

    return {
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
    };
  },

  /**
   * Mengambil data statistik dashboard admin
   */
  getDashboardStats: async () => {
    const totalGrounds = await GroundModel.countAll();
    const totalRentals = await CatalogModel.countByCategoryAndStatus('rental', 'approved');
    const totalWarungs = await CatalogModel.countByCategoryAndStatus('warung', 'approved');
    const totalPhotographers = await CatalogModel.countByCategoryAndStatus('photographer', 'approved');

    const pendingRows = await CatalogModel.findPending(10);
    const recentActivities = await CatalogModel.findRecentActivities(5);

    return {
      total_warung: totalWarungs,
      total_rental: totalRentals,
      total_photographer: totalPhotographers,
      total_grounds: totalGrounds,
      pending_count: pendingRows.length,
      pending_registrations: pendingRows,
      recent_activities: recentActivities
    };
  },

  /**
   * Menambahkan ulasan pengunjung baru
   */
  createReview: async (payload: CreateReviewDTO) => {
    const { visitor_name, rating, comment, visit_date } = payload;

    if (isEmpty(visitor_name) || isEmpty(rating) || isEmpty(comment)) {
      throw new HomeServiceError('Nama pengunjung, rating (1-5), dan komentar wajib diisi!', 400);
    }

    const nameCheck = validateLength(visitor_name, 100, 'Nama pengunjung');
    if (!nameCheck.isValid) throw new HomeServiceError(nameCheck.error || 'Nama pengunjung terlalu panjang.', 400);

    const parsedRating = parseInt(rating as string, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      throw new HomeServiceError('Rating harus berupa angka 1 sampai 5.', 400);
    }

    return ReviewModel.create({
      visitor_name: String(visitor_name).trim(),
      rating: parsedRating,
      comment: String(comment).trim(),
      visit_date: visit_date || 'Hari ini'
    });
  },

  /**
   * Menghapus ulasan pengunjung
   */
  deleteReview: async (id: number | string) => {
    const existing = await ReviewModel.findById(id);
    if (!existing) {
      throw new HomeServiceError('Ulasan tidak ditemukan.', 404);
    }

    await ReviewModel.delete(id);
    return existing;
  },

  /**
   * Memperbarui banyak konfigurasi situs sekaligus
   */
  updateConfigs: async (req: Request | any, updates: Record<string, any>) => {
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      throw new HomeServiceError('Payload konfigurasi tidak valid.', 400);
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

    return formattedConfigs;
  },

  /**
   * Mengunggah gambar peta perkemahan atau evakuasi
   */
  uploadMapImage: async (req: Request | any, file: any, mapType?: string) => {
    if (!file) {
      throw new HomeServiceError('File gambar peta wajib diunggah!', 400);
    }

    const relativePath = `/uploads/maps/${file.filename}`;
    const configKey = mapType === 'evacuation' ? 'evacuation_map_url' : 'overall_ground_map_url';

    await ConfigModel.upsert(configKey, relativePath);

    return {
      config_key: configKey,
      relative_path: relativePath,
      full_url: formatImageUrl(req, relativePath)
    };
  }
};

export default homeService;

