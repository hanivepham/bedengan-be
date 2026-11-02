const pool = require('../config/db');

/**
 * Data Access Layer (DAL) untuk Tabel admins
 */
const AdminModel = {
  findByEmail: async (email) => {
    const [rows] = await pool.query(
      'SELECT id, name, email, password_hash, created_at FROM admins WHERE email = ?',
      [String(email).trim().toLowerCase()]
    );
    return rows[0] || null;
  },

  findById: async (id) => {
    const [rows] = await pool.query(
      'SELECT id, name, email, created_at FROM admins WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  findFullById: async (id) => {
    const [rows] = await pool.query(
      'SELECT * FROM admins WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  updateProfile: async (id, { name, passwordHash }) => {
    await pool.query(
      'UPDATE admins SET name = ?, password_hash = ? WHERE id = ?',
      [name, passwordHash, id]
    );
    return AdminModel.findById(id);
  }
};

module.exports = AdminModel;