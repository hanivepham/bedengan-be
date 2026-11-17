import { Request } from 'express';
import GroundModel from '../models/GroundModel';
import ConfigModel from '../models/ConfigModel';
import { formatImageUrl } from '../utils/responseHelper';
import { isEmpty, validateEnum, validateLength } from '../utils/validator';
import { CreateGroundDTO, UpdateGroundDTO, GroundEntity } from '../types';

export class GroundServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Helper: Format output ground item dengan URL Cloudinary/lokal dan specs objek
 */
export const formatGroundItem = (req: Request | any, g: any): GroundEntity | null => {
  if (!g) return null;
  const fullImageUrl = formatImageUrl(req, g.image_url || g.file_url);
  return {
    ...g,
    is_active: Boolean(g.is_active),
    image_url: fullImageUrl,
    specs: {
      area_size: g.area_size || '',
      terrain_feature: g.terrain_feature || '',
      nearby_facility: g.nearby_facility || '',
      toilet_distance: g.toilet_distance || ''
    }
  };
};

export const groundService = {
  /**
   * Mengambil semua daftar ground beserta peta & etika
   */
  getAllGrounds: async (req: Request | any) => {
    const configs = await ConfigModel.getByKeys([
      'overall_ground_map_url',
      'etiquette_title',
      'etiquette_description'
    ]);

    const grounds = await GroundModel.findAll();
    const formattedGrounds = grounds.map((g: any) => formatGroundItem(req, g));

    return {
      overall_ground_map_url: formatImageUrl(req, configs.overall_ground_map_url || '/uploads/maps/bedengan_map.png'),
      etiquette_summary: {
        title: configs.etiquette_title || 'Etika Berkemah di Bedengan',
        description: configs.etiquette_description || 'Mohon jaga kelestarian alam hutan pinus Bedengan. Bawa kantong sampah sendiri, hindari membuat perapian liar di akar pohon pinus, dan hormati ketenangan sesama camper setelah pukul 22.00 WIB.'
      },
      grounds: formattedGrounds
    };
  },

  /**
   * Mengambil detail satu ground berdasarkan kode atau ID
   */
  getGroundDetail: async (req: Request | any, code: string) => {
    const g = await GroundModel.findByCodeOrId(code);
    if (!g) {
      throw new GroundServiceError(`Ground dengan kode atau ID '${code}' tidak ditemukan.`, 404);
    }
    return formatGroundItem(req, g);
  },

  /**
   * Menambahkan zona ground baru
   */
  createGround: async (req: Request | any, payload: CreateGroundDTO, file?: any) => {
    const {
      code,
      name,
      capacity_badge,
      description,
      area_size,
      terrain_feature,
      nearby_facility,
      toilet_distance,
      highlight_text,
      highlight_theme,
      is_active
    } = payload;

    if (isEmpty(code) || isEmpty(name) || isEmpty(capacity_badge)) {
      throw new GroundServiceError('Field code, name, dan capacity_badge wajib diisi!', 400);
    }

    const cleanCode = String(code).trim().toUpperCase();
    const codeRegex = /^[A-Za-z0-9]{1,2}$/;
    if (!codeRegex.test(cleanCode)) {
      throw new GroundServiceError('Kode ground wajib 1 s/d 2 karakter alfanumerik (contoh: A, B, M, 01)!', 400);
    }

    // Periksa duplikasi kode
    const existing = await GroundModel.findByCode(cleanCode);
    if (existing) {
      throw new GroundServiceError(`Kode ground '${cleanCode}' sudah digunakan!`, 400);
    }

    // Validasi tema
    let theme = 'green';
    if (!isEmpty(highlight_theme)) {
      const themeVal = validateEnum(highlight_theme, ['green', 'blue', 'orange', 'teal', 'purple'], 'Highlight Theme');
      if (!themeVal.isValid) throw new GroundServiceError(themeVal.error || 'Highlight Theme tidak valid', 400);
      theme = themeVal.value;
    }

    // Validasi panjang
    const nameCheck = validateLength(name, 50, 'Nama ground');
    if (!nameCheck.isValid) throw new GroundServiceError(nameCheck.error || 'Nama ground terlalu panjang.', 400);

    const capCheck = validateLength(capacity_badge, 100, 'Kapasitas badge');
    if (!capCheck.isValid) throw new GroundServiceError(capCheck.error || 'Kapasitas badge terlalu panjang.', 400);

    let imageUrl: string | null = null;
    if (file) {
      imageUrl = `/uploads/grounds/${file.filename}`;
    } else if (payload.image_url && typeof payload.image_url === 'string') {
      imageUrl = payload.image_url;
    }

    const newGround = await GroundModel.create({
      code: cleanCode,
      name: String(name).trim(),
      capacity_badge: String(capacity_badge).trim(),
      description: description || '',
      area_size: area_size || '',
      terrain_feature: terrain_feature || '',
      nearby_facility: nearby_facility || '',
      toilet_distance: toilet_distance || '',
      highlight_text: highlight_text || '',
      highlight_theme: theme,
      image_url: imageUrl,
      is_active: is_active !== undefined ? (is_active === 'false' || is_active === false || is_active === 0 || is_active === '0' ? 0 : 1) : 1
    });

    return formatGroundItem(req, newGround);
  },

  /**
   * Memperbarui data ground
   */
  updateGround: async (req: Request | any, id: number | string, payload: UpdateGroundDTO, file?: any) => {
    const oldGround = await GroundModel.findById(id);
    if (!oldGround) {
      throw new GroundServiceError('Ground tidak ditemukan.', 404);
    }

    let cleanCode = oldGround.code;
    if (payload.code !== undefined) {
      cleanCode = String(payload.code).trim().toUpperCase();
      const codeRegex = /^[A-Za-z0-9]{1,2}$/;
      if (!codeRegex.test(cleanCode)) {
        throw new GroundServiceError('Kode ground wajib 1 s/d 2 karakter alfanumerik!', 400);
      }
      if (cleanCode !== oldGround.code) {
        const existing = await GroundModel.findByCode(cleanCode);
        if (existing) {
          throw new GroundServiceError(`Kode ground '${cleanCode}' sudah digunakan!`, 400);
        }
      }
    }

    let theme = oldGround.highlight_theme;
    if (payload.highlight_theme !== undefined) {
      const themeVal = validateEnum(payload.highlight_theme, ['green', 'blue', 'orange', 'teal', 'purple'], 'Highlight Theme');
      if (!themeVal.isValid) throw new GroundServiceError(themeVal.error || 'Tema highlight tidak valid.', 400);
      theme = themeVal.value;
    }

    if (payload.name !== undefined) {
      if (isEmpty(payload.name)) throw new GroundServiceError('Nama tidak boleh kosong!', 400);
      const nameCheck = validateLength(payload.name, 50, 'Nama ground');
      if (!nameCheck.isValid) throw new GroundServiceError(nameCheck.error || 'Nama ground terlalu panjang.', 400);
    }

    if (payload.capacity_badge !== undefined) {
      if (isEmpty(payload.capacity_badge)) throw new GroundServiceError('Kapasitas badge tidak boleh kosong!', 400);
      const capCheck = validateLength(payload.capacity_badge, 100, 'Kapasitas badge');
      if (!capCheck.isValid) throw new GroundServiceError(capCheck.error || 'Kapasitas badge terlalu panjang.', 400);
    }

    let imageUrl = oldGround.image_url;
    if (file) {
      imageUrl = `/uploads/grounds/${file.filename}`;
    } else if (payload.image_url !== undefined) {
      imageUrl = payload.image_url;
    }

    let isActive = oldGround.is_active;
    if (payload.is_active !== undefined) {
      isActive = (payload.is_active === 'false' || payload.is_active === false || payload.is_active === 0 || payload.is_active === '0') ? 0 : 1;
    }

    const updatedGround = await GroundModel.update(id, {
      code: cleanCode,
      name: payload.name !== undefined ? String(payload.name).trim() : oldGround.name,
      capacity_badge: payload.capacity_badge !== undefined ? String(payload.capacity_badge).trim() : oldGround.capacity_badge,
      description: payload.description !== undefined ? payload.description : oldGround.description,
      area_size: payload.area_size !== undefined ? payload.area_size : oldGround.area_size,
      terrain_feature: payload.terrain_feature !== undefined ? payload.terrain_feature : oldGround.terrain_feature,
      nearby_facility: payload.nearby_facility !== undefined ? payload.nearby_facility : oldGround.nearby_facility,
      toilet_distance: payload.toilet_distance !== undefined ? payload.toilet_distance : oldGround.toilet_distance,
      highlight_text: payload.highlight_text !== undefined ? payload.highlight_text : oldGround.highlight_text,
      highlight_theme: theme,
      image_url: imageUrl,
      is_active: isActive
    });

    return formatGroundItem(req, updatedGround);
  },

  /**
   * Menghapus zona ground
   */
  deleteGround: async (id: number | string) => {
    const oldGround = await GroundModel.findById(id);
    if (!oldGround) {
      throw new GroundServiceError('Ground tidak ditemukan.', 404);
    }

    await GroundModel.delete(id);
    return oldGround;
  }
};

export default groundService;

