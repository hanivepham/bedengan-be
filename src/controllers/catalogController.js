const pool = require('../config/db');
const { successResponse, errorResponse, formatImageUrl } = require('../utils/responseHelper');

/**
 * Controller untuk Katalog Layanan & Fasilitas Bedengan Xplore
 * Kategori: rental, warung, photographer
 */
const catalogController = {
  // GET /api/catalogs (Public)
  getAllCatalogs: async (req, res) => {
    try {
      const { category, search, status } = req.query;

      let sql = 'SELECT * FROM catalogs WHERE 1=1';
      const params = [];

      if (category && ['rental', 'warung', 'photographer'].includes(category.toLowerCase())) {
        sql += ' AND category = ?';
        params.push(category.toLowerCase());
      }

      if (status && status !== 'all') {
        sql += ' AND status = ?';
        params.push(status.toLowerCase());
      }

      if (search && search.trim()) {
        const queryTerm = `%${search.trim()}%`;
        sql += ' AND (name LIKE ? OR description LIKE ? OR location_note LIKE ? OR tags LIKE ? OR applicant_name LIKE ?)';
        params.push(queryTerm, queryTerm, queryTerm, queryTerm, queryTerm);
      }

      sql += ' ORDER BY created_at DESC';

      const [rows] = await pool.query(sql, params);

      const catalogs = rows.map((item) => ({
        ...item,
        image_url: formatImageUrl(req, item.image_url)
      }));

      return successResponse(res, 'Data katalog berhasil diambil.', catalogs);
    } catch (error) {
      console.error('[Catalogs Error]', error);
      return errorResponse(res, 'Gagal mengambil data katalog.', 500, error.message);
    }
  },

  // GET /api/catalogs/:id (Public)
  getCatalogDetail: async (req, res) => {
    try {
      const { id } = req.params;

      const [rows] = await pool.query('SELECT * FROM catalogs WHERE id = ?', [id]);
      if (rows.length === 0) {
        return errorResponse(res, 'Item katalog tidak ditemukan.', 404);
      }

      const item = rows[0];

      return successResponse(res, 'Detail item katalog berhasil diambil.', {
        ...item,
        image_url: formatImageUrl(req, item.image_url)
      });
    } catch (error) {
      return errorResponse(res, 'Gagal mengambil detail item katalog.', 500, error.message);
    }
  },

  // POST /api/catalogs (Protected + Multer 'image' atau Public untuk pengajuan baru)
  createCatalog: async (req, res) => {
    try {
      const {
        category,
        name,
        price_text,
        description,
        location_note,
        contact_phone,
        operating_hours,
        status,
        applicant_name,
        social_handle,
        tags
      } = req.body;

      if (!category || !name) {
        return errorResponse(res, 'Field category dan name wajib diisi!', 400);
      }

      if (!['rental', 'warung', 'photographer'].includes(category.toLowerCase())) {
        return errorResponse(res, "Kategori harus salah satu dari: 'rental', 'warung', 'photographer'.", 400);
      }

      let imageUrl = null;
      if (req.file) {
        imageUrl = `/uploads/catalogs/${req.file.filename}`;
      } else if (req.body.image_url) {
        imageUrl = req.body.image_url;
      }

      // Jika dibuat oleh publik / pemohon, default 'pending', jika admin default 'approved'
      const itemStatus = status || (req.admin ? 'approved' : 'pending');

      const [result] = await pool.query(
        `INSERT INTO catalogs (
          category, name, price_text, description, location_note,
          contact_phone, operating_hours, image_url, status, applicant_name, social_handle, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          category.toLowerCase(),
          name.trim(),
          price_text || '',
          description || '',
          location_note || '',
          contact_phone || '',
          operating_hours || '',
          imageUrl,
          itemStatus,
          applicant_name || null,
          social_handle || null,
          tags || null
        ]
      );

      const [newItemRows] = await pool.query('SELECT * FROM catalogs WHERE id = ?', [result.insertId]);
      const newItem = newItemRows[0];

      return successResponse(
        res,
        'Item katalog berhasil ditambahkan.',
        {
          ...newItem,
          image_url: formatImageUrl(req, newItem.image_url)
        },
        201
      );
    } catch (error) {
      console.error('[Create Catalog Error]', error);
      return errorResponse(res, 'Gagal menambahkan item katalog.', 500, error.message);
    }
  },

  // PUT /api/catalogs/:id (Protected + Multer 'image')
  updateCatalog: async (req, res) => {
    try {
      const { id } = req.params;

      const [rows] = await pool.query('SELECT * FROM catalogs WHERE id = ?', [id]);
      if (rows.length === 0) {
        return errorResponse(res, 'Item katalog tidak ditemukan.', 404);
      }

      const oldItem = rows[0];

      const category = req.body.category !== undefined ? req.body.category.toLowerCase() : oldItem.category;
      const name = req.body.name !== undefined ? req.body.name.trim() : oldItem.name;
      const price_text = req.body.price_text !== undefined ? req.body.price_text : oldItem.price_text;
      const description = req.body.description !== undefined ? req.body.description : oldItem.description;
      const location_note = req.body.location_note !== undefined ? req.body.location_note : oldItem.location_note;
      const contact_phone = req.body.contact_phone !== undefined ? req.body.contact_phone : oldItem.contact_phone;
      const operating_hours = req.body.operating_hours !== undefined ? req.body.operating_hours : oldItem.operating_hours;
      const status = req.body.status !== undefined ? req.body.status : oldItem.status;
      const applicant_name = req.body.applicant_name !== undefined ? req.body.applicant_name : oldItem.applicant_name;
      const social_handle = req.body.social_handle !== undefined ? req.body.social_handle : oldItem.social_handle;
      const tags = req.body.tags !== undefined ? req.body.tags : oldItem.tags;

      let imageUrl = oldItem.image_url;
      if (req.file) {
        imageUrl = `/uploads/catalogs/${req.file.filename}`;
      } else if (req.body.image_url !== undefined) {
        imageUrl = req.body.image_url;
      }

      await pool.query(
        `UPDATE catalogs SET
          category = ?, name = ?, price_text = ?, description = ?,
          location_note = ?, contact_phone = ?, operating_hours = ?,
          image_url = ?, status = ?, applicant_name = ?, social_handle = ?, tags = ?
        WHERE id = ?`,
        [
          category,
          name,
          price_text,
          description,
          location_note,
          contact_phone,
          operating_hours,
          imageUrl,
          status,
          applicant_name,
          social_handle,
          tags,
          id
        ]
      );

      const [updatedRows] = await pool.query('SELECT * FROM catalogs WHERE id = ?', [id]);
      const updatedItem = updatedRows[0];

      return successResponse(res, 'Item katalog berhasil diperbarui.', {
        ...updatedItem,
        image_url: formatImageUrl(req, updatedItem.image_url)
      });
    } catch (error) {
      console.error('[Update Catalog Error]', error);
      return errorResponse(res, 'Gagal memperbarui item katalog.', 500, error.message);
    }
  },

  // DELETE /api/catalogs/:id (Protected)
  deleteCatalog: async (req, res) => {
    try {
      const { id } = req.params;

      const [rows] = await pool.query('SELECT * FROM catalogs WHERE id = ?', [id]);
      if (rows.length === 0) {
        return errorResponse(res, 'Item katalog tidak ditemukan.', 404);
      }

      await pool.query('DELETE FROM catalogs WHERE id = ?', [id]);

      return successResponse(res, `Item katalog '${rows[0].name}' berhasil dihapus.`);
    } catch (error) {
      return errorResponse(res, 'Gagal menghapus item katalog.', 500, error.message);
    }
  }
};

module.exports = catalogController;
