import pool from '../config/db';

/**
 * Data Access Layer (DAL) untuk Tabel admins
 */
export const AdminModel = {
  findByEmail: async (email: string) => {
    const [rows]: any = await pool.query(
      'SELECT id, name, email, password_hash, created_at FROM admins WHERE email = ?',
      [String(email).trim().toLowerCase()]
    );
    return rows[0] || null;
  },

  findById: async (id: number | string) => {
    const [rows]: any = await pool.query(
      'SELECT id, name, email, created_at FROM admins WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  findFullById: async (id: number | string) => {
    const [rows]: any = await pool.query(
      'SELECT * FROM admins WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  updateProfile: async (id: number | string, { name, passwordHash }: { name: string; passwordHash: string }) => {
    await pool.query(
      'UPDATE admins SET name = ?, password_hash = ? WHERE id = ?',
      [name, passwordHash, id]
    );
    return AdminModel.findById(id);
  }
};

export default AdminModel;

