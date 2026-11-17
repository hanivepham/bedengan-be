import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import AdminModel from '../models/AdminModel';
import { isEmpty, validateEmail, validateLength } from '../utils/validator';
import { LoginDTO, UpdateProfileDTO } from '../types';

export class AuthServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const authService = {
  /**
   * Autentikasi login admin dan generate JWT token
   */
  login: async ({ email, password }: LoginDTO) => {
    if (isEmpty(email) || isEmpty(password)) {
      throw new AuthServiceError('Email dan password wajib diisi!', 400);
    }

    const emailVal = validateEmail(email as string);
    if (!emailVal.isValid) {
      throw new AuthServiceError(emailVal.error || 'Format email tidak valid.', 400);
    }

    const admin = await AdminModel.findByEmail(emailVal.sanitized);
    if (!admin) {
      throw new AuthServiceError('Kredensial tidak valid. Email tidak terdaftar.', 401);
    }

    const isMatch = await bcrypt.compare(password as string, admin.password_hash || admin.password);
    if (!isMatch) {
      throw new AuthServiceError('Kredensial tidak valid. Password salah.', 401);
    }

    const jwtSecret = process.env.JWT_SECRET || 'bedengan_xplore_secret_key_2026';
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        name: admin.name
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return {
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    };
  },

  /**
   * Mengambil data profil admin saat ini
   */
  getMe: async (adminId: number) => {
    const admin = await AdminModel.findById(adminId);
    if (!admin) {
      throw new AuthServiceError('Data admin tidak ditemukan.', 404);
    }

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      created_at: admin.created_at
    };
  },

  /**
   * Memperbarui profil atau mengganti password admin
   */
  updateProfile: async (adminId: number, { name, email, currentPassword, newPassword }: UpdateProfileDTO) => {
    const currentAdmin = await AdminModel.findFullById(adminId);
    if (!currentAdmin) {
      throw new AuthServiceError('Data admin tidak ditemukan.', 404);
    }

    let updatedName = currentAdmin.name;
    if (name !== undefined) {
      if (isEmpty(name)) {
        throw new AuthServiceError('Nama tidak boleh kosong.', 400);
      }
      const nameCheck = validateLength(name, 100, 'Nama admin');
      if (!nameCheck.isValid) {
        throw new AuthServiceError(nameCheck.error || 'Nama admin terlalu panjang.', 400);
      }
      updatedName = String(name).trim();
    }

    let updatedEmail = currentAdmin.email;
    if (email !== undefined) {
      const emailVal = validateEmail(email);
      if (!emailVal.isValid) {
        throw new AuthServiceError(emailVal.error || 'Format email tidak valid.', 400);
      }
      const existing = await AdminModel.findByEmail(emailVal.sanitized);
      if (existing && existing.id !== adminId) {
        throw new AuthServiceError('Email sudah digunakan oleh admin lain.', 400);
      }
      updatedEmail = emailVal.sanitized;
    }

    let updatedPasswordHash = currentAdmin.password;
    if (newPassword) {
      if (!currentPassword) {
        throw new AuthServiceError('Password saat ini wajib diisi untuk mengubah password.', 400);
      }
      const isMatch = await bcrypt.compare(currentPassword, currentAdmin.password_hash || currentAdmin.password);
      if (!isMatch) {
        throw new AuthServiceError('Password saat ini salah.', 400);
      }
      if (newPassword.length < 6) {
        throw new AuthServiceError('Password baru minimal 6 karakter.', 400);
      }
      const salt = await bcrypt.genSalt(10);
      updatedPasswordHash = await bcrypt.hash(newPassword, salt);
    }

    await AdminModel.updateProfile(adminId, {
      name: updatedName,
      passwordHash: updatedPasswordHash
    });

    const updatedAdmin = await AdminModel.findById(adminId);
    return {
      id: updatedAdmin.id,
      name: updatedAdmin.name,
      email: updatedAdmin.email
    };
  }
};

export default authService;
