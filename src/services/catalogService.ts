import { Request } from 'express';
import CatalogModel from '../models/CatalogModel';
import { formatImageUrl } from '../utils/responseHelper';
import {
  isEmpty,
  validatePhone,
  validateOperatingHours,
  validateEnum,
  validateLength
} from '../utils/validator';
import { CatalogEntity, CatalogFilterDTO, CreateCatalogDTO, UpdateCatalogDTO } from '../types';

export class CatalogServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Helper: Parse data tags dari database menjadi Array string[]
 */
export const parseTags = (rawTags: any): string[] => {
  if (rawTags === null || rawTags === undefined) return [];
  if (Array.isArray(rawTags)) {
    return rawTags.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof rawTags === 'string') {
    const trimmed = rawTags.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((t) => String(t).trim()).filter(Boolean);
        }
      } catch {
        // Fallback ke pemecahan koma jika parse JSON gagal
      }
    }
    return trimmed
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
};

/**
 * Helper: Standarisasi data tags untuk disimpan ke kolom VARCHAR(255) di database
 */
export const serializeTags = (inputTags: any): string | null => {
  if (inputTags === null || inputTags === undefined) return null;
  const parsed = parseTags(inputTags);
  if (parsed.length === 0) return null;
  return parsed.join(', ');
};

/**
 * Helper: Format output catalog item dengan tags array & absolute Cloudinary/local image_url + banner_url
 */
export const formatCatalogItem = (req: Request | any, item: any): CatalogEntity | null => {
  if (!item) return null;
  const tagsArray = parseTags(item.tags);
  const rawImageUrl = item.banner_url || item.image_url || item.file_url;
  const fullImageUrl = formatImageUrl(req, rawImageUrl);
  return {
    ...item,
    tags: tagsArray,
    tags_raw: item.tags || '',
    image_url: fullImageUrl,
    banner_url: fullImageUrl
  };
};

/**
 * Helper: Ekstrak field body dengan dukungan snake_case dan camelCase (Frontend kompatibilitas)
 */
export const extractCatalogPayload = (req: Request | any): CreateCatalogDTO => {
  const b = req.body || {};

  let category = b.category ? String(b.category).trim().toLowerCase() : undefined;
  if (category === 'fotografer') category = 'photographer';
  if (category === 'kuliner') category = 'warung';

  const name = b.name !== undefined ? String(b.name).trim() : undefined;
  const price_text = b.price_text !== undefined ? String(b.price_text).trim() : (b.price !== undefined ? String(b.price).trim() : undefined);
  const description = b.description !== undefined ? String(b.description).trim() : undefined;
  const location_note = b.location_note !== undefined ? String(b.location_note).trim() : (b.address !== undefined ? String(b.address).trim() : (b.location !== undefined ? String(b.location).trim() : undefined));
  const contact_phone = b.contact_phone !== undefined ? String(b.contact_phone).trim() : (b.whatsapp !== undefined ? String(b.whatsapp).trim() : (b.phone !== undefined ? String(b.phone).trim() : undefined));

  let operating_hours = b.operating_hours !== undefined ? String(b.operating_hours).trim() : undefined;
  if (!operating_hours && b.openingTime && b.closingTime) {
    operating_hours = `${String(b.openingTime).trim()} - ${String(b.closingTime).trim()}`;
  }

  let status = b.status !== undefined ? String(b.status).trim().toLowerCase() : undefined;
  if (status === 'active') status = 'approved';
  if (status === 'inactive') status = 'pending';

  const applicant_name = b.applicant_name !== undefined ? String(b.applicant_name).trim() : (b.applicantName !== undefined ? String(b.applicantName).trim() : undefined);
  const social_handle = b.social_handle !== undefined ? String(b.social_handle).trim() : (b.instagramUsername !== undefined ? String(b.instagramUsername).trim() : (b.instagram !== undefined ? String(b.instagram).trim() : undefined));

  const tags = b.tags !== undefined ? b.tags : undefined;

  return {
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
  };
};

export const catalogService = {
  /**
   * Mengambil semua katalog dengan filter
   */
  getAllCatalogs: async (req: Request | any, filters: CatalogFilterDTO) => {
    const rows = await CatalogModel.findAll(filters);
    return rows.map((item: any) => formatCatalogItem(req, item));
  },

  /**
   * Mengambil detail katalog berdasarkan ID
   */
  getCatalogDetail: async (req: Request | any, id: number | string) => {
    const item = await CatalogModel.findById(id);
    if (!item) {
      throw new CatalogServiceError('Item katalog tidak ditemukan.', 404);
    }
    return formatCatalogItem(req, item);
  },

  /**
   * Menambahkan katalog baru (Admin atau pengajuan publik)
   */
  createCatalog: async (req: Request | any, payload: CreateCatalogDTO, file?: any, isAdmin: boolean = false) => {
    if (isEmpty(payload.category)) {
      throw new CatalogServiceError('Field category wajib diisi!', 400);
    }
    const catVal = validateEnum(payload.category as string, ['rental', 'warung', 'photographer'], 'Kategori');
    if (!catVal.isValid) {
      throw new CatalogServiceError(catVal.error || 'Kategori tidak valid.', 400);
    }
    const category = catVal.value;

    if (isEmpty(payload.name)) {
      throw new CatalogServiceError('Field name wajib diisi!', 400);
    }
    const nameCheck = validateLength(payload.name as string, 150, 'Nama katalog');
    if (!nameCheck.isValid) {
      throw new CatalogServiceError(nameCheck.error || 'Nama katalog terlalu panjang.', 400);
    }

    let contact_phone = '';
    if (!isEmpty(payload.contact_phone)) {
      const phoneVal = validatePhone(payload.contact_phone as string, {
        allowLandline: false,
        fieldName: 'Nomor WhatsApp / Kontak'
      });
      if (!phoneVal.isValid) {
        throw new CatalogServiceError(phoneVal.error || 'Nomor WhatsApp tidak valid.', 400);
      }
      contact_phone = phoneVal.normalized;
    }

    let operating_hours = '';
    if (!isEmpty(payload.operating_hours)) {
      const hoursVal = validateOperatingHours(payload.operating_hours as string);
      if (!hoursVal.isValid) {
        throw new CatalogServiceError(hoursVal.error || 'Jam operasional tidak valid.', 400);
      }
      operating_hours = hoursVal.formatted;
    }

    let itemStatus = payload.status || (isAdmin ? 'approved' : 'pending');
    const statusVal = validateEnum(itemStatus, ['approved', 'pending', 'rejected'], 'Status');
    if (!statusVal.isValid) {
      throw new CatalogServiceError(statusVal.error || 'Status tidak valid.', 400);
    }
    itemStatus = statusVal.value;

    if (payload.location_note) {
      const locCheck = validateLength(payload.location_note, 150, 'Catatan lokasi / Alamat');
      if (!locCheck.isValid) throw new CatalogServiceError(locCheck.error || 'Catatan lokasi terlalu panjang.', 400);
    }
    if (payload.price_text) {
      const priceCheck = validateLength(payload.price_text, 100, 'Keterangan harga');
      if (!priceCheck.isValid) throw new CatalogServiceError(priceCheck.error || 'Keterangan harga terlalu panjang.', 400);
    }

    let imageUrl: string | null = null;
    if (file) {
      imageUrl = `/uploads/catalogs/${file.filename}`;
    } else if (req.body?.image_url && typeof req.body.image_url === 'string') {
      imageUrl = req.body.image_url;
    } else if (req.body?.image && typeof req.body.image === 'string' && !req.body.image.startsWith('blob:')) {
      imageUrl = req.body.image;
    }

    const serializedTags = serializeTags(payload.tags);
    if (serializedTags) {
      const tagsCheck = validateLength(serializedTags, 255, 'Tags / Fasilitas');
      if (!tagsCheck.isValid) throw new CatalogServiceError(tagsCheck.error || 'Tags terlalu panjang.', 400);
    }

    const newItem = await CatalogModel.create({
      category,
      name: payload.name,
      price_text: payload.price_text || '',
      description: payload.description || '',
      location_note: payload.location_note || '',
      contact_phone,
      operating_hours,
      image_url: imageUrl,
      status: itemStatus,
      applicant_name: payload.applicant_name || null,
      social_handle: payload.social_handle || null,
      tags: serializedTags
    });

    return formatCatalogItem(req, newItem);
  },

  /**
   * Memperbarui katalog
   */
  updateCatalog: async (req: Request | any, id: number | string, payload: UpdateCatalogDTO, file?: any) => {
    const oldItem = await CatalogModel.findById(id);
    if (!oldItem) {
      throw new CatalogServiceError('Item katalog tidak ditemukan.', 404);
    }

    let category = oldItem.category;
    if (payload.category !== undefined) {
      const catVal = validateEnum(payload.category, ['rental', 'warung', 'photographer'], 'Kategori');
      if (!catVal.isValid) throw new CatalogServiceError(catVal.error || 'Kategori tidak valid.', 400);
      category = catVal.value;
    }

    let name = oldItem.name;
    if (payload.name !== undefined) {
      if (isEmpty(payload.name)) throw new CatalogServiceError('Nama katalog tidak boleh kosong!', 400);
      const nameCheck = validateLength(payload.name, 150, 'Nama katalog');
      if (!nameCheck.isValid) throw new CatalogServiceError(nameCheck.error || 'Nama katalog terlalu panjang.', 400);
      name = payload.name;
    }

    let contact_phone = oldItem.contact_phone;
    if (payload.contact_phone !== undefined) {
      if (!isEmpty(payload.contact_phone)) {
        const phoneVal = validatePhone(payload.contact_phone, {
          allowLandline: false,
          fieldName: 'Nomor WhatsApp / Kontak'
        });
        if (!phoneVal.isValid) throw new CatalogServiceError(phoneVal.error || 'Nomor WhatsApp tidak valid.', 400);
        contact_phone = phoneVal.normalized;
      } else {
        contact_phone = '';
      }
    }

    let operating_hours = oldItem.operating_hours;
    if (payload.operating_hours !== undefined) {
      if (!isEmpty(payload.operating_hours)) {
        const hoursVal = validateOperatingHours(payload.operating_hours);
        if (!hoursVal.isValid) throw new CatalogServiceError(hoursVal.error || 'Jam operasional tidak valid.', 400);
        operating_hours = hoursVal.formatted;
      } else {
        operating_hours = '';
      }
    }

    let status = oldItem.status;
    if (payload.status !== undefined) {
      const statusVal = validateEnum(payload.status, ['approved', 'pending', 'rejected'], 'Status');
      if (!statusVal.isValid) throw new CatalogServiceError(statusVal.error || 'Status tidak valid.', 400);
      status = statusVal.value;
    }

    if (payload.location_note !== undefined && payload.location_note) {
      const locCheck = validateLength(payload.location_note, 150, 'Catatan lokasi / Alamat');
      if (!locCheck.isValid) throw new CatalogServiceError(locCheck.error || 'Catatan lokasi terlalu panjang.', 400);
    }
    if (payload.price_text !== undefined && payload.price_text) {
      const priceCheck = validateLength(payload.price_text, 100, 'Keterangan harga');
      if (!priceCheck.isValid) throw new CatalogServiceError(priceCheck.error || 'Keterangan harga terlalu panjang.', 400);
    }

    let imageUrl = oldItem.image_url;
    if (file) {
      imageUrl = `/uploads/catalogs/${file.filename}`;
    } else if (req.body?.image_url && typeof req.body.image_url === 'string') {
      imageUrl = req.body.image_url;
    } else if (req.body?.image && typeof req.body.image === 'string' && !req.body.image.startsWith('blob:')) {
      imageUrl = req.body.image;
    }

    let tags = oldItem.tags;
    if (payload.tags !== undefined) {
      const serializedTags = serializeTags(payload.tags);
      if (serializedTags) {
        const tagsCheck = validateLength(serializedTags, 255, 'Tags / Fasilitas');
        if (!tagsCheck.isValid) throw new CatalogServiceError(tagsCheck.error || 'Tags terlalu panjang.', 400);
      }
      tags = serializedTags;
    }

    const updated = await CatalogModel.update(id, {
      category,
      name,
      price_text: payload.price_text !== undefined ? payload.price_text : oldItem.price_text,
      description: payload.description !== undefined ? payload.description : oldItem.description,
      location_note: payload.location_note !== undefined ? payload.location_note : oldItem.location_note,
      contact_phone,
      operating_hours,
      image_url: imageUrl,
      status,
      applicant_name: payload.applicant_name !== undefined ? payload.applicant_name : oldItem.applicant_name,
      social_handle: payload.social_handle !== undefined ? payload.social_handle : oldItem.social_handle,
      tags
    });

    return formatCatalogItem(req, updated);
  },

  /**
   * Menghapus katalog
   */
  deleteCatalog: async (id: number | string) => {
    const existing = await CatalogModel.findById(id);
    if (!existing) {
      throw new CatalogServiceError('Item katalog tidak ditemukan.', 404);
    }

    await CatalogModel.delete(id);
    return existing;
  }
};

export default catalogService;

