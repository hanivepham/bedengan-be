const GroundModel = require('../models/GroundModel');
const ConfigModel = require('../models/ConfigModel');
const { successResponse, errorResponse, formatImageUrl } = require('../utils/responseHelper');
const { isEmpty, validateEnum, validateLength } = require('../utils/validator');

/**
 * Helper: Format output ground item
 */
const formatGroundItem = (req, g) => {
  if (!g) return null;
  const fullImageUrl = formatImageUrl(req, g.image_url);
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

/**
 * Controller untuk Manajemen Zona Perkemahan (Grounds A-M)
 * Menggunakan GroundModel dan ConfigModel (DAL)
 */
const groundController = {
  // GET /api/grounds (Public)
  getAllGrounds: async (req, res) => {
    try {
      const configs = await ConfigModel.getByKeys([
        'overall_ground_map_url',
        'etiquette_title',
        'etiquette_description'
      ]);

      const grounds = await GroundModel.findAll();
      const formattedGrounds = grounds.map((g) => formatGroundItem(req, g));

      return successResponse(res, 'Daftar seluruh zona ground berhasil diambil.', {
        overall_ground_map_url: formatImageUrl(req, configs.overall_ground_map_url || '/uploads/maps/bedengan_map.png'),
        etiquette_summary: {
          title: configs.etiquette_title || 'Etika Berkemah di Bedengan',
          description: configs.etiquette_description || 'Jaga kebersihan alam dan ketenangan lingkungan.'
        },
        grounds: formattedGrounds
      });
    } catch (error) {
      console.error('[Grounds Error]', error);
      return errorResponse(res, 'Gagal mengambil data zona perkemahan.', 500, error.message);
    }
  },

  // GET /api/grounds/:code (Public)
  getGroundDetail: async (req, res) => {
    try {
      const { code } = req.params;

      const g = await GroundModel.findByCodeOrId(code);
      if (!g) {
        return errorResponse(res, `Ground dengan kode atau ID '${code}' tidak ditemukan.`, 404);
      }

      return successResponse(res, 'Detail ground berhasil diambil.', formatGroundItem(req, g));
    } catch (error) {
      return errorResponse(res, 'Gagal mengambil detail ground.', 500, error.message);
    }
  },

  // POST /api/grounds (Protected + Multer)
  createGround: async (req, res) => {
    try {
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
      } = req.body;

      if (isEmpty(code) || isEmpty(name) || isEmpty(capacity_badge)) {
        return errorResponse(res, 'Field code, name, dan capacity_badge wajib diisi!', 400);
      }

      const cleanCode = String(code).trim().toUpperCase();
      const codeRegex = /^[A-Za-z0-9]{1,2}$/;
      if (!codeRegex.test(cleanCode)) {
        return errorResponse(res, 'Kode ground wajib 1 s/d 2 karakter alfanumerik (contoh: A, B, M, 01)!', 400);
      }

      // Periksa duplikasi kode
      const existing = await GroundModel.findByCode(cleanCode);
      if (existing) {
        return errorResponse(res, `Kode ground '${cleanCode}' sudah digunakan!`, 400);
      }

      // Validasi tema
      let theme = 'green';
      if (!isEmpty(highlight_theme)) {
        const themeVal = validateEnum(highlight_theme, ['green', 'blue', 'orange', 'teal', 'purple'], 'Highlight Theme');
        if (!themeVal.isValid) return errorResponse(res, themeVal.error, 400);
        theme = themeVal.value;
      }

      // Validasi panjang
      const nameCheck = validateLength(name, 50, 'Nama ground');
      if (!nameCheck.isValid) return errorResponse(res, nameCheck.error, 400);

      const capCheck = validateLength(capacity_badge, 100, 'Kapasitas badge');
      if (!capCheck.isValid) return errorResponse(res, capCheck.error, 400);

      let imageUrl = null;
      if (req.file) {
        imageUrl = `/uploads/grounds/${req.file.filename}`;
      } else if (req.body.image_url && typeof req.body.image_url === 'string') {
        imageUrl = req.body.image_url;
      } else if (req.body.image && typeof req.body.image === 'string' && !req.body.image.startsWith('blob:')) {
        imageUrl = req.body.image;
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

      return successResponse(
        res,
        'Zona perkemahan baru berhasil ditambahkan.',
        formatGroundItem(req, newGround),
        201
      );
    } catch (error) {
      console.error('[Create Ground Error]', error);
      return errorResponse(res, 'Gagal menambahkan ground baru.', 500, error.message);
    }
  },

  // PUT /api/grounds/:id (Protected + Multer)
  updateGround: async (req, res) => {
    try {
      const { id } = req.params;

      const oldGround = await GroundModel.findById(id);
      if (!oldGround) {
        return errorResponse(res, 'Ground tidak ditemukan.', 404);
      }

      let code = oldGround.code;
      if (req.body.code !== undefined && !isEmpty(req.body.code)) {
        const cleanCode = String(req.body.code).trim().toUpperCase();
        const codeRegex = /^[A-Za-z0-9]{1,2}$/;
        if (!codeRegex.test(cleanCode)) {
          return errorResponse(res, 'Kode ground wajib 1 s/d 2 karakter alfanumerik!', 400);
        }

        if (cleanCode !== oldGround.code) {
          const conflict = await GroundModel.findConflictCode(cleanCode, id);
          if (conflict) {
            return errorResponse(res, `Kode ground '${cleanCode}' sudah dipakai oleh zona lain!`, 400);
          }
        }
        code = cleanCode;
      }

      let name = oldGround.name;
      if (req.body.name !== undefined) {
        if (isEmpty(req.body.name)) return errorResponse(res, 'Nama ground tidak boleh kosong!', 400);
        const nameCheck = validateLength(req.body.name, 50, 'Nama ground');
        if (!nameCheck.isValid) return errorResponse(res, nameCheck.error, 400);
        name = String(req.body.name).trim();
      }

      const capacity_badge = req.body.capacity_badge !== undefined ? String(req.body.capacity_badge).trim() : oldGround.capacity_badge;
      const description = req.body.description !== undefined ? req.body.description : oldGround.description;
      const area_size = req.body.area_size !== undefined ? req.body.area_size : oldGround.area_size;
      const terrain_feature = req.body.terrain_feature !== undefined ? req.body.terrain_feature : oldGround.terrain_feature;
      const nearby_facility = req.body.nearby_facility !== undefined ? req.body.nearby_facility : oldGround.nearby_facility;
      const toilet_distance = req.body.toilet_distance !== undefined ? req.body.toilet_distance : oldGround.toilet_distance;
      const highlight_text = req.body.highlight_text !== undefined ? req.body.highlight_text : oldGround.highlight_text;

      let highlight_theme = oldGround.highlight_theme;
      if (req.body.highlight_theme !== undefined) {
        const themeVal = validateEnum(req.body.highlight_theme, ['green', 'blue', 'orange', 'teal', 'purple'], 'Highlight Theme');
        if (!themeVal.isValid) return errorResponse(res, themeVal.error, 400);
        highlight_theme = themeVal.value;
      }

      let is_active = oldGround.is_active;
      if (req.body.is_active !== undefined) {
        is_active = (req.body.is_active === 'false' || req.body.is_active === false || req.body.is_active === 0 || req.body.is_active === '0') ? 0 : 1;
      }

      let imageUrl = oldGround.image_url;
      if (req.file) {
        imageUrl = `/uploads/grounds/${req.file.filename}`;
      } else if (req.body.image_url !== undefined && typeof req.body.image_url === 'string') {
        imageUrl = req.body.image_url;
      } else if (req.body.image !== undefined && typeof req.body.image === 'string' && !req.body.image.startsWith('blob:')) {
        imageUrl = req.body.image;
      }

      const updatedGround = await GroundModel.update(id, {
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
        image_url: imageUrl,
        is_active
      });

      return successResponse(res, 'Data zona perkemahan berhasil diperbarui.', formatGroundItem(req, updatedGround));
    } catch (error) {
      console.error('[Update Ground Error]', error);
      return errorResponse(res, 'Gagal memperbarui ground.', 500, error.message);
    }
  },

  // DELETE /api/grounds/:id (Protected)
  deleteGround: async (req, res) => {
    try {
      const { id } = req.params;

      const oldGround = await GroundModel.findById(id);
      if (!oldGround) {
        return errorResponse(res, 'Ground tidak ditemukan.', 404);
      }

      await GroundModel.delete(id);

      return successResponse(res, `Ground '${oldGround.name}' (${oldGround.code}) berhasil dihapus.`);
    } catch (error) {
      return errorResponse(res, 'Gagal menghapus ground.', 500, error.message);
    }
  }
};

module.exports = groundController;