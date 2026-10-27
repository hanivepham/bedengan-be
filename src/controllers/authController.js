const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * Controller untuk Autentikasi Admin
 */
const authController = {
  // POST /api/auth/login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return errorResponse(res, 'Email dan password wajib diisi!', 400);
      }

      const [rows] = await pool.query(
        'SELECT id, name, email, password_hash, created_at FROM admins WHERE email = ?',
        [email.trim().toLowerCase()]
      );

      if (rows.length === 0) {
        return errorResponse(res, 'Kredensial tidak valid. Email tidak terdaftar.', 401);
      }

      const admin = rows[0];
      const isMatch = await bcrypt.compare(password, admin.password_hash);

      if (!isMatch) {
        return errorResponse(res, 'Kredensial tidak valid. Password salah.', 401);
      }

      const jwtSecret = process.env.JWT_SECRET || 'bedengan_xplore_secret_key_2026';
      const token = jwt.sign(
        { id: admin.id, email: admin.email, name: admin.name },
        jwtSecret,
        { expiresIn: '24h' }
      );

      return successResponse(res, 'Login berhasil. Selamat datang di Bedengan Xplore Admin!', {
        token,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          created_at: admin.created_at
        }
      });
    } catch (error) {
      console.error('[Auth Error]', error);
      return errorResponse(res, 'Gagal memproses login.', 500, error.message);
    }
  },

  // GET /api/auth/me (Protected)
  getMe: async (req, res) => {
    try {
      return successResponse(res, 'Data profil admin berhasil diambil.', {
        admin: req.admin
      });
    } catch (error) {
      return errorResponse(res, 'Gagal mengambil data profil.', 500, error.message);
    }
  },

  // PUT /api/auth/profile (Protected) - Update nama atau ganti password
  updateProfile: async (req, res) => {
    try {
      const adminId = req.admin.id;
      const { name, current_password, new_password } = req.body;

      const [rows] = await pool.query('SELECT * FROM admins WHERE id = ?', [adminId]);
      if (rows.length === 0) {
        return errorResponse(res, 'Admin tidak ditemukan.', 404);
      }

      const admin = rows[0];

      let updatedName = admin.name;
      if (name && name.trim()) {
        updatedName = name.trim();
      }

      let passwordHash = admin.password_hash;
      if (new_password) {
        if (!current_password) {
          return errorResponse(res, 'Password saat ini wajib diisi untuk mengganti password baru.', 400);
        }

        const isMatch = await bcrypt.compare(current_password, admin.password_hash);
        if (!isMatch) {
          return errorResponse(res, 'Password saat ini tidak sesuai!', 400);
        }

        if (new_password.length < 6) {
          return errorResponse(res, 'Password baru minimal 6 karakter!', 400);
        }

        passwordHash = await bcrypt.hash(new_password, 10);
      }

      await pool.query(
        'UPDATE admins SET name = ?, password_hash = ? WHERE id = ?',
        [updatedName, passwordHash, adminId]
      );

      return successResponse(res, 'Profil berhasil diperbarui.', {
        admin: {
          id: admin.id,
          name: updatedName,
          email: admin.email
        }
      });
    } catch (error) {
      return errorResponse(res, 'Gagal memperbarui profil.', 500, error.message);
    }
  }
};

module.exports = authController;
