const CatalogModel = require('../models/CatalogModel');
const { successResponse, errorResponse, formatImageUrl } = require('../utils/responseHelper');
const {
  isEmpty,
  validatePhone,
  validateOperatingHours,
  validateEnum,
  validateLength
} = require('../utils/validator');

/**
 * Helper: Parse data tags dari database menjadi Array string[]
 * Mendukung format string berpemisah koma ("Kopi, Teh"), JSON string ('["Kopi"]'), maupun Array
 */
const parseTags = (rawTags) => {
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
const serializeTags = (inputTags) => {
  if (inputTags === null || inputTags === undefined) return null;
  const parsed = parseTags(inputTags);
  if (parsed.length === 0) return null;
  return parsed.join(', ');
};

/**
 * Helper: Format output catalog item dengan tags array & absolute image_url
 */
const formatCatalogItem = (req, item) => {
  if (!item) return null;
  const tagsArray = parseTags(item.tags);
  return {
    ...item,
    tags: tagsArray,
    tags_raw: item.tags || '',
    image_url: formatImageUrl(req, item.image_url)
  };
};

/**
 * Helper: Ekstrak field body dengan dukungan snake_case dan camelCase (Frontend kompatibilitas)
 */
const extractCatalogPayload = (req) => {
  const b = req.body || {};

  // Kategori: petakan juga alias 'fotografer' -> 'photographer', 'kuliner' -> 'warung'
  let category = b.category ? String(b.category).trim().toLowerCase() : undefined;
  if (category === 'fotografer') category = 'photographer';
  if (category === 'kuliner') category = 'warung';

  const name = b.name !== undefined ? String(b.name).trim() : undefined;
  const price_text = b.price_text !== undefined ? String(b.price_text).trim() : (b.price !== undefined ? String(b.price).trim() : undefined);
  const description = b.description !== undefined ? String(b.description).trim() : undefined;
  const location_note = b.location_note !== undefined ? String(b.location_note).trim() : (b.address !== undefined ? String(b.address).trim() : (b.location !== undefined ? String(b.location).trim() : undefined));
  const contact_phone = b.contact_phone !== undefined ? String(b.contact_phone).trim() : (b.whatsapp !== undefined ? String(b.whatsapp).trim() : (b.phone !== undefined ? String(b.phone).trim() : undefined));

  // Operating hours: dukung string tunggal maupun gabungan openingTime & closingTime
  let operating_hours = b.operating_hours !== undefined ? String(b.operating_hours).trim() : undefined;
  if (!operating_hours && b.openingTime && b.closingTime) {
    operating_hours = `${String(b.openingTime).trim()} - ${String(b.closingTime).trim()}`;
  }

  // Status: petakan juga 'active' -> 'approved', 'inactive' -> 'pending' jika dikirim dari frontend mock
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

/**
 * Controller untuk Katalog Layanan & Fasilitas Bedengan Xplore
 * Kategori: rental, warung, photographer
 */
const catalogController = {
  // GET /api/catalogs (Public)
  getAllCatalogs: async (req, res) => {
    try {
      const { category, search, status } = req.query;

      const rows = await CatalogModel.findAll({ category, search, status });

      const catalogs = rows.map((item) => formatCatalogItem(req, item));

      return successResponse(res, 'Data katalog berhasil diambil.', catalogs);
    } catch (error) {
      console.error('[Catalogs Error]', error);
      return errorResponse(res, 'Gagal mengambil data katalog.', 500, error.message);
    }
  },

  // GET /api/catalogs/:id (Public)
  getCatalogDetail: async (req, res) => {
    try {
      const { id } = req.params;

      const item = await CatalogModel.findById(id);
      if (!item) {
        return errorResponse(res, 'Item katalog tidak ditemukan.', 404);
      }

      return successResponse(res, 'Detail item katalog berhasil diambil.', formatCatalogItem(req, item));
    } catch (error) {
      return errorResponse(res, 'Gagal mengambil detail item katalog.', 500, error.message);
    }
  },

  // POST /api/catalogs (Protected + Multer 'image' atau Public untuk pengajuan baru)
  createCatalog: async (req, res) => {
    try {
      const payload = extractCatalogPayload(req);

      // 1. Validasi Kategori
      if (isEmpty(payload.category)) {
        return errorResponse(res, 'Field category wajib diisi!', 400);
      }
      const catVal = validateEnum(payload.category, ['rental', 'warung', 'photographer'], 'Kategori');
      if (!catVal.isValid) {
        return errorResponse(res, catVal.error, 400);
      }
      const category = catVal.value;

      // 2. Validasi Nama
      if (isEmpty(payload.name)) {
        return errorResponse(res, 'Field name wajib diisi!', 400);
      }
      const nameCheck = validateLength(payload.name, 150, 'Nama katalog');
      if (!nameCheck.isValid) {
        return errorResponse(res, nameCheck.error, 400);
      }

      // 3. Validasi Nomor HP / WhatsApp (Poin Revisi 2)
      let contact_phone = '';
      if (!isEmpty(payload.contact_phone)) {
        const phoneVal = validatePhone(payload.contact_phone, {
          allowLandline: false,
          fieldName: 'Nomor WhatsApp / Kontak'
        });
        if (!phoneVal.isValid) {
          return errorResponse(res, phoneVal.error, 400);
        }
        contact_phone = phoneVal.normalized;
      }

      // 4. Validasi Jam Buka / Operasional (Poin Revisi 4)
      let operating_hours = '';
      if (!isEmpty(payload.operating_hours)) {
        const hoursVal = validateOperatingHours(payload.operating_hours);
        if (!hoursVal.isValid) {
          return errorResponse(res, hoursVal.error, 400);
        }
        operating_hours = hoursVal.formatted;
      }

      // 5. Validasi Status jika dikirim
      let itemStatus = payload.status || (req.admin ? 'approved' : 'pending');
      const statusVal = validateEnum(itemStatus, ['approved', 'pending', 'rejected'], 'Status');
      if (!statusVal.isValid) {
        return errorResponse(res, statusVal.error, 400);
      }
      itemStatus = statusVal.value;

      // 6. Validasi Panjang Field Teks Lainnya
      if (payload.location_note) {
        const locCheck = validateLength(payload.location_note, 150, 'Catatan lokasi / Alamat');
        if (!locCheck.isValid) return errorResponse(res, locCheck.error, 400);
      }
      if (payload.price_text) {
        const priceCheck = validateLength(payload.price_text, 100, 'Keterangan harga');
        if (!priceCheck.isValid) return errorResponse(res, priceCheck.error, 400);
      }

      // 7. Penanganan Gambar
      let imageUrl = null;
      if (req.file) {
        imageUrl = `/uploads/catalogs/${req.file.filename}`;
      } else if (req.body.image_url && typeof req.body.image_url === 'string') {
        imageUrl = req.body.image_url;
      } else if (req.body.image && typeof req.body.image === 'string' && !req.body.image.startsWith('blob:')) {
        imageUrl = req.body.image;
      }

      // 8. Serialisasi tags
      const serializedTags = serializeTags(payload.tags);
      if (serializedTags) {
        const tagsCheck = validateLength(serializedTags, 255, 'Tags / Fasilitas');
        if (!tagsCheck.isValid) return errorResponse(res, tagsCheck.error, 400);
      }

      // Simpan melalui Model DAL
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

      return successResponse(
        res,
        'Item katalog berhasil ditambahkan.',
        formatCatalogItem(req, newItem),
        201
      );
    } catch (error) {
      console.error('[Create Catalog Error]', error);
      return errorResponse(res, 'Gagal menambahkan item katalog.', 500, error.message);
    }
  },

  // PUT /api/catalogs/:id (Protected + Multer 'image')
  updateCatalog: async (req, res) => {
    try {
      const { id } = req.params;

      const oldItem = await CatalogModel.findById(id);
      if (!oldItem) {
        return errorResponse(res, 'Item katalog tidak ditemukan.', 404);
      }

      const payload = extractCatalogPayload(req);

      // Kategori
      let category = oldItem.category;
      if (payload.category !== undefined) {
        const catVal = validateEnum(payload.category, ['rental', 'warung', 'photographer'], 'Kategori');
        if (!catVal.isValid) return errorResponse(res, catVal.error, 400);
        category = catVal.value;
      }

      // Nama
      let name = oldItem.name;
      if (payload.name !== undefined) {
        if (isEmpty(payload.name)) return errorResponse(res, 'Nama tidak boleh kosong!', 400);
        const nameCheck = validateLength(payload.name, 150, 'Nama katalog');
        if (!nameCheck.isValid) return errorResponse(res, nameCheck.error, 400);
        name = payload.name;
      }

      // Kontak Phone
      let contact_phone = oldItem.contact_phone;
      if (payload.contact_phone !== undefined) {
        if (!isEmpty(payload.contact_phone)) {
          const phoneVal = validatePhone(payload.contact_phone, {
            allowLandline: false,
            fieldName: 'Nomor WhatsApp / Kontak'
          });
          if (!phoneVal.isValid) return errorResponse(res, phoneVal.error, 400);
          contact_phone = phoneVal.normalized;
        } else {
          contact_phone = '';
        }
      }

      // Operating Hours
      let operating_hours = oldItem.operating_hours;
      if (payload.operating_hours !== undefined) {
        if (!isEmpty(payload.operating_hours)) {
          const hoursVal = validateOperatingHours(payload.operating_hours);
          if (!hoursVal.isValid) return errorResponse(res, hoursVal.error, 400);
          operating_hours = hoursVal.formatted;
        } else {
          operating_hours = '';
        }
      }

      // Status
      let status = oldItem.status;
      if (payload.status !== undefined) {
        const statusVal = validateEnum(payload.status, ['approved', 'pending', 'rejected'], 'Status');
        if (!statusVal.isValid) return errorResponse(res, statusVal.error, 400);
        status = statusVal.value;
      }

      const price_text = payload.price_text !== undefined ? payload.price_text : oldItem.price_text;
      const description = payload.description !== undefined ? payload.description : oldItem.description;
      const location_note = payload.location_note !== undefined ? payload.location_note : oldItem.location_note;
      const applicant_name = payload.applicant_name !== undefined ? payload.applicant_name : oldItem.applicant_name;
      const social_handle = payload.social_handle !== undefined ? payload.social_handle : oldItem.social_handle;

      // Tags
      let tags = oldItem.tags;
      if (payload.tags !== undefined) {
        tags = serializeTags(payload.tags);
      }

      // Gambar
      let imageUrl = oldItem.image_url;
      if (req.file) {
        imageUrl = `/uploads/catalogs/${req.file.filename}`;
      } else if (req.body.image_url !== undefined && typeof req.body.image_url === 'string') {
        imageUrl = req.body.image_url;
      } else if (req.body.image !== undefined && typeof req.body.image === 'string' && !req.body.image.startsWith('blob:')) {
        imageUrl = req.body.image;
      }

      const updatedItem = await CatalogModel.update(id, {
        category,
        name,
        price_text,
        description,
        location_note,
        contact_phone,
        operating_hours,
        image_url: imageUrl,
        status,
        applicant_name,
        social_handle,
        tags
      });

      return successResponse(res, 'Item katalog berhasil diperbarui.', formatCatalogItem(req, updatedItem));
    } catch (error) {
      console.error('[Update Catalog Error]', error);
      return errorResponse(res, 'Gagal memperbarui item katalog.', 500, error.message);
    }
  },

  // DELETE /api/catalogs/:id (Protected)
  deleteCatalog: async (req, res) => {
    try {
      const { id } = req.params;

      const item = await CatalogModel.findById(id);
      if (!item) {
        return errorResponse(res, 'Item katalog tidak ditemukan.', 404);
      }

      await CatalogModel.delete(id);

      return successResponse(res, `Item katalog '${item.name}' berhasil dihapus.`);
    } catch (error) {
      return errorResponse(res, 'Gagal menghapus item katalog.', 500, error.message);
    }
  }
};

module.exports = catalogController;