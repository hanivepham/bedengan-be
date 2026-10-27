const pool = require('../config/db');
const { successResponse, errorResponse, formatImageUrl } = require('../utils/responseHelper');

/**
 * Controller untuk Beranda Aplikasi, Ringkasan Statistik, Ulasan Pengunjung, dan Konfigurasi Situs
 */
const homeController = {
  // GET /api/home (Public)
  getHomeData: async (req, res) => {
    try {
      // 1. Ambil site_configs
      const [configRows] = await pool.query('SELECT config_key, config_value FROM site_configs');
      const configs = {};
      configRows.forEach((row) => {
        let val = row.config_value;
        if (row.config_key.includes('map_url') || row.config_key.includes('image')) {
          val = formatImageUrl(req, val);
        }
        configs[row.config_key] = val;
      });

      // 2. Ringkasan Statistik
      const [groundsCount] = await pool.query('SELECT COUNT(*) as count FROM grounds WHERE is_active = TRUE');
      const [catalogsRental] = await pool.query("SELECT COUNT(*) as count FROM catalogs WHERE category = 'rental' AND status = 'approved'");
      const [catalogsWarung] = await pool.query("SELECT COUNT(*) as count FROM catalogs WHERE category = 'warung' AND status = 'approved'");
      const [catalogsPhoto] = await pool.query("SELECT COUNT(*) as count FROM catalogs WHERE category = 'photographer' AND status = 'approved'");
      const [pendingCount] = await pool.query("SELECT COUNT(*) as count FROM catalogs WHERE status = 'pending'");

      // 3. Ulasan Pengunjung
      const [reviews] = await pool.query(
        'SELECT id, visitor_name, rating, comment, visit_date, created_at FROM reviews WHERE is_published = TRUE ORDER BY id DESC LIMIT 10'
      );

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
          total_grounds: groundsCount[0].count,
          total_rentals: catalogsRental[0].count,
          total_warungs: catalogsWarung[0].count,
          total_photographers: catalogsPhoto[0].count,
          pending_applications: pendingCount[0].count
        },
        reviews,
        configs
      });
    } catch (error) {
      console.error('[Home Error]', error);
      return errorResponse(res, 'Gagal mengambil data beranda.', 500, error.message);
    }
  },

  // GET /api/home/dashboard (Protected - data lengkap untuk Next.js Admin Panel)
  getDashboardStats: async (req, res) => {
    try {
      const [groundsCount] = await pool.query('SELECT COUNT(*) as count FROM grounds');
      const [catalogsRental] = await pool.query("SELECT COUNT(*) as count FROM catalogs WHERE category = 'rental' AND status = 'approved'");
      const [catalogsWarung] = await pool.query("SELECT COUNT(*) as count FROM catalogs WHERE category = 'warung' AND status = 'approved'");
      const [catalogsPhoto] = await pool.query("SELECT COUNT(*) as count FROM catalogs WHERE category = 'photographer' AND status = 'approved'");
      const [pendingRows] = await pool.query(
        "SELECT id, name, category, applicant_name, created_at, status FROM catalogs WHERE status = 'pending' ORDER BY created_at DESC"
      );

      const [recentActivities] = await pool.query(
        'SELECT id, name, category, created_at as timestamp FROM catalogs ORDER BY created_at DESC LIMIT 5'
      );

      return successResponse(res, 'Data statistik dashboard berhasil diambil.', {
        total_warung: catalogsWarung[0].count,
        total_rental: catalogsRental[0].count,
        total_photographer: catalogsPhoto[0].count,
        total_grounds: groundsCount[0].count,
        pending_count: pendingRows.length,
        pending_registrations: pendingRows,
        recent_activities: recentActivities
      });
    } catch (error) {
      return errorResponse(res, 'Gagal mengambil data dashboard.', 500, error.message);
    }
  },

  // POST /api/home/reviews (Public/Admin)
  createReview: async (req, res) => {
    try {
      const { visitor_name, rating, comment, visit_date } = req.body;

      if (!visitor_name || !rating || !comment) {
        return errorResponse(res, 'Nama pengunjung, rating (1-5), dan komentar wajib diisi!', 400);
      }

      const parsedRating = parseInt(rating, 10);
      if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return errorResponse(res, 'Rating harus berupa angka 1 sampai 5.', 400);
      }

      const [result] = await pool.query(
        'INSERT INTO reviews (visitor_name, rating, comment, visit_date, is_published) VALUES (?, ?, ?, ?, TRUE)',
        [visitor_name.trim(), parsedRating, comment.trim(), visit_date || 'Hari ini']
      );

      const [newReview] = await pool.query('SELECT * FROM reviews WHERE id = ?', [result.insertId]);

      return successResponse(res, 'Terima kasih! Ulasan Anda berhasil dikirimkan.', newReview[0], 201);
    } catch (error) {
      return errorResponse(res, 'Gagal menambahkan ulasan.', 500, error.message);
    }
  },

  // DELETE /api/home/reviews/:id (Protected)
  deleteReview: async (req, res) => {
    try {
      const { id } = req.params;

      const [existing] = await pool.query('SELECT id, visitor_name FROM reviews WHERE id = ?', [id]);
      if (existing.length === 0) {
        return errorResponse(res, 'Ulasan tidak ditemukan.', 404);
      }

      await pool.query('DELETE FROM reviews WHERE id = ?', [id]);

      return successResponse(res, 'Ulasan berhasil dihapus.');
    } catch (error) {
      return errorResponse(res, 'Gagal menghapus ulasan.', 500, error.message);
    }
  },

  // PUT /api/home/configs (Protected)
  updateConfigs: async (req, res) => {
    try {
      const updates = req.body; // e.g. { about_bedengan: "...", etiquette_title: "..." }

      if (!updates || typeof updates !== 'object') {
        return errorResponse(res, 'Payload konfigurasi tidak valid.', 400);
      }

      for (const [key, value] of Object.entries(updates)) {
        await pool.query(
          `INSERT INTO site_configs (config_key, config_value)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
          [key, String(value)]
        );
      }

      const [configRows] = await pool.query('SELECT config_key, config_value FROM site_configs');
      const configs = {};
      configRows.forEach((row) => {
        let val = row.config_value;
        if (row.config_key.includes('map_url') || row.config_key.includes('image')) {
          val = formatImageUrl(req, val);
        }
        configs[row.config_key] = val;
      });

      return successResponse(res, 'Konfigurasi situs berhasil diperbarui.', configs);
    } catch (error) {
      console.error('[Config Error]', error);
      return errorResponse(res, 'Gagal memperbarui konfigurasi.', 500, error.message);
    }
  },

  // POST /api/home/configs/upload-map (Protected + Multer)
  uploadMapImage: async (req, res) => {
    try {
      if (!req.file) {
        return errorResponse(res, 'File gambar peta wajib diunggah!', 400);
      }

      const { map_type } = req.body; // 'overall' atau 'evacuation'
      const relativePath = `/uploads/maps/${req.file.filename}`;
      const configKey = map_type === 'evacuation' ? 'evacuation_map_url' : 'overall_ground_map_url';

      await pool.query(
        `INSERT INTO site_configs (config_key, config_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
        [configKey, relativePath]
      );

      return successResponse(res, 'Gambar peta berhasil diperbarui.', {
        config_key: configKey,
        relative_path: relativePath,
        full_url: formatImageUrl(req, relativePath)
      });
    } catch (error) {
      return errorResponse(res, 'Gagal mengunggah gambar peta.', 500, error.message);
    }
  }
};

module.exports = homeController;
