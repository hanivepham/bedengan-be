const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AdminModel = require('../models/AdminModel');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { isEmpty, validateEmail, validateLength } = require('../utils/validator');

/**
 * Controller untuk Autentikasi Admin
 * Akses database sepenuhnya melalui Data Access Layer (AdminModel)
 */
const authController = {
  // POST /api/auth/login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (isEmpty(email) || isEmpty(password)) {
        return errorResponse(res, 'Email dan password wajib diisi!', 400);
      }

      const emailVal = validateEmail(email);
      if (!emailVal.isValid) {
        return errorResponse(res, emailVal.error, 400);
      }

      const admin = await AdminModel.findByEmail(emailVal.sanitized);

      if (!admin) {
        return errorResponse(res, 'Kredensial tidak valid. Email tidak terdaftar.', 401);
      }

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

      const admin = await AdminModel.findFullById(adminId);
      if (!admin) {
        return errorResponse(res, 'Admin tidak ditemukan.', 404);
      }

      let updatedName = admin.name;
      if (!isEmpty(name)) {
        const lengthCheck = validateLength(name.trim(), 100, 'Nama');
        if (!lengthCheck.isValid) {
          return errorResponse(res, lengthCheck.error, 400);
        }
        updatedName = name.trim();
      }

      let passwordHash = admin.password_hash;
      if (!isEmpty(new_password)) {
        if (isEmpty(current_password)) {
          return errorResponse(res, 'Password saat ini wajib diisi untuk mengganti password baru.', 400);
        }

        const isMatch = await bcrypt.compare(current_password, admin.password_hash);
        if (!isMatch) {
          return errorResponse(res, 'Password saat ini tidak sesuai!', 400);
        }

        if (String(new_password).length < 6) {
          return errorResponse(res, 'Password baru minimal 6 karakter!', 400);
        }

        passwordHash = await bcrypt.hash(String(new_password), 10);
      }

      const updatedAdmin = await AdminModel.updateProfile(adminId, {
        name: updatedName,
        passwordHash
      });

      return successResponse(res, 'Profil berhasil diperbarui.', {
        admin: {
          id: updatedAdmin.id,
          name: updatedAdmin.name,
          email: updatedAdmin.email
        }
      });
    } catch (error) {
      console.error('[Update Profile Error]', error);
      return errorResponse(res, 'Gagal memperbarui profil.', 500, error.message);
    }
  }
};

module.exports = authController;