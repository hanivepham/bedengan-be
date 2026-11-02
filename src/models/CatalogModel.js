const pool = require('../config/db');

/**
 * Data Access Layer (DAL) untuk Tabel catalogs
 */
const CatalogModel = {
  findAll: async ({ category, status, search }) => {
    let sql = 'SELECT * FROM catalogs WHERE 1=1';
    const params = [];

    if (category) {
      let mappedCategory = category.toLowerCase();
      if (mappedCategory === 'fotografer') mappedCategory = 'photographer';
      if (mappedCategory === 'kuliner') mappedCategory = 'warung';

      if (['rental', 'warung', 'photographer'].includes(mappedCategory)) {
        sql += ' AND category = ?';
        params.push(mappedCategory);
      }
    }

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status.toLowerCase());
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ' AND (name LIKE ? OR description LIKE ? OR location_note LIKE ? OR tags LIKE ? OR applicant_name LIKE ?)';
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  findById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM catalogs WHERE id = ?', [id]);
    return rows[0] || null;
  },

  create: async (data) => {
    const [result] = await pool.query(
      `INSERT INTO catalogs (
        category, name, price_text, description, location_note,
        contact_phone, operating_hours, image_url, status, applicant_name, social_handle, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.category,
        data.name,
        data.price_text || '',
        data.description || '',
        data.location_note || '',
        data.contact_phone || '',
        data.operating_hours || '',
        data.image_url || null,
        data.status || 'approved',
        data.applicant_name || null,
        data.social_handle || null,
        data.tags || null
      ]
    );

    return CatalogModel.findById(result.insertId);
  },

  update: async (id, data) => {
    await pool.query(
      `UPDATE catalogs SET
        category = ?, name = ?, price_text = ?, description = ?,
        location_note = ?, contact_phone = ?, operating_hours = ?,
        image_url = ?, status = ?, applicant_name = ?, social_handle = ?, tags = ?
      WHERE id = ?`,
      [
        data.category,
        data.name,
        data.price_text,
        data.description,
        data.location_note,
        data.contact_phone,
        data.operating_hours,
        data.image_url,
        data.status,
        data.applicant_name,
        data.social_handle,
        data.tags,
        id
      ]
    );

    return CatalogModel.findById(id);
  },

  delete: async (id) => {
    const [result] = await pool.query('DELETE FROM catalogs WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  countByCategoryAndStatus: async (category, status = 'approved') => {
    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM catalogs WHERE category = ? AND status = ?',
      [category, status]
    );
    return rows[0].count;
  },

  countPending: async () => {
    const [rows] = await pool.query(
      "SELECT COUNT(*) as count FROM catalogs WHERE status = 'pending'"
    );
    return rows[0].count;
  },

  findPending: async (limit = 10) => {
    const [rows] = await pool.query(
      `SELECT id, name, category, applicant_name, created_at, status
       FROM catalogs
       WHERE status = 'pending'
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  },

  findRecentActivities: async (limit = 5) => {
    const [rows] = await pool.query(
      'SELECT id, name, category, created_at as timestamp FROM catalogs ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return rows;
  }
};

module.exports = CatalogModel;