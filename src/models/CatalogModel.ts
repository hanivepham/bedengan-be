import pool from '../config/db';

/**
 * Data Access Layer (DAL) untuk Tabel catalogs
 */
export const CatalogModel = {
  findAll: async ({ category, status, search }: { category?: string; status?: string; search?: string } = {}) => {
    let sql = `
      SELECT 
        c.*,
        ci.file_url,
        COALESCE(ci.file_url, c.image_url) AS image_url,
        COALESCE(ci.file_url, c.image_url) AS banner_url
      FROM catalogs c
      LEFT JOIN cloud_images ci ON ci.id = (
        SELECT MAX(sub_ci.id)
        FROM cloud_images sub_ci
        WHERE sub_ci.entity_type IN ('catalog', 'rental', 'warung', 'photographer')
          AND sub_ci.entity_id = c.id
      )
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category) {
      let mappedCategory = category.toLowerCase();
      if (mappedCategory === 'fotografer') mappedCategory = 'photographer';
      if (mappedCategory === 'kuliner') mappedCategory = 'warung';

      if (['rental', 'warung', 'photographer'].includes(mappedCategory)) {
        sql += ' AND c.category = ?';
        params.push(mappedCategory);
      }
    }

    if (status && status !== 'all') {
      sql += ' AND c.status = ?';
      params.push(status.toLowerCase());
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ' AND (c.name LIKE ? OR c.description LIKE ? OR c.location_note LIKE ? OR c.tags LIKE ? OR c.applicant_name LIKE ?)';
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY c.created_at DESC';

    const [rows]: any = await pool.query(sql, params);
    return rows;
  },

  findById: async (id: number | string) => {
    const [rows]: any = await pool.query(
      `SELECT 
        c.*, 
        ci.file_url,
        COALESCE(ci.file_url, c.image_url) AS image_url,
        COALESCE(ci.file_url, c.image_url) AS banner_url
      FROM catalogs c
      LEFT JOIN cloud_images ci ON ci.id = (
        SELECT MAX(sub_ci.id)
        FROM cloud_images sub_ci
        WHERE sub_ci.entity_type IN ('catalog', 'rental', 'warung', 'photographer')
          AND sub_ci.entity_id = c.id
      )
      WHERE c.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  create: async (data: any) => {
    const [result]: any = await pool.query(
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

  update: async (id: number | string, data: any) => {
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

  delete: async (id: number | string) => {
    const [result]: any = await pool.query('DELETE FROM catalogs WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  countByCategoryAndStatus: async (category: string, status: string = 'approved') => {
    const [rows]: any = await pool.query(
      'SELECT COUNT(*) as count FROM catalogs WHERE category = ? AND status = ?',
      [category, status]
    );
    return rows[0].count;
  },

  countPending: async () => {
    const [rows]: any = await pool.query(
      "SELECT COUNT(*) as count FROM catalogs WHERE status = 'pending'"
    );
    return rows[0].count;
  },

  findPending: async (limit: number = 10) => {
    const [rows]: any = await pool.query(
      `SELECT id, name, category, applicant_name, created_at, status
       FROM catalogs
       WHERE status = 'pending'
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  },

  findRecentActivities: async (limit: number = 5) => {
    const [rows]: any = await pool.query(
      'SELECT id, name, category, created_at as timestamp FROM catalogs ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return rows;
  }
};

export default CatalogModel;

