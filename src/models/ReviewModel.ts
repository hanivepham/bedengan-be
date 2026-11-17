import pool from '../config/db';

/**
 * Data Access Layer (DAL) untuk Tabel reviews
 */
export const ReviewModel = {
  findPublished: async (limit: number = 10) => {
    const [rows]: any = await pool.query(
      'SELECT id, visitor_name, rating, comment, visit_date, created_at FROM reviews WHERE is_published = TRUE ORDER BY id DESC LIMIT ?',
      [limit]
    );
    return rows;
  },

  findById: async (id: number | string) => {
    const [rows]: any = await pool.query('SELECT * FROM reviews WHERE id = ?', [id]);
    return rows[0] || null;
  },

  create: async (data: any) => {
    const [result]: any = await pool.query(
      'INSERT INTO reviews (visitor_name, rating, comment, visit_date, is_published) VALUES (?, ?, ?, ?, TRUE)',
      [data.visitor_name, data.rating, data.comment, data.visit_date || 'Hari ini']
    );
    return ReviewModel.findById(result.insertId);
  },

  delete: async (id: number | string) => {
    const [result]: any = await pool.query('DELETE FROM reviews WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

export default ReviewModel;

