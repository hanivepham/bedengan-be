const GuideModel = require('../models/GuideModel');
const ConfigModel = require('../models/ConfigModel');
const { successResponse, errorResponse, formatImageUrl } = require('../utils/responseHelper');
const { isEmpty, validatePhone, validateEnum, validateLength } = require('../utils/validator');

/**
 * Controller untuk Panduan Berkemah, Aturan, Peringatan, Etika, dan Kontak Darurat
 * Menggunakan GuideModel dan ConfigModel (DAL)
 */
const guideController = {
  // GET /api/guides (Public)
  getGuidesData: async (req, res) => {
    try {
      const configs = await ConfigModel.getByKeys([
        'evacuation_map_url',
        'etiquette_title',
        'etiquette_description'
      ]);

      const allRules = await GuideModel.findAllRules();

      const rules = allRules.filter((r) => r.type === 'rule');
      const warnings = allRules.filter((r) => r.type === 'warning');
      const etiquette = allRules.filter((r) => r.type === 'etiquette');

      const emergencyContacts = await GuideModel.findAllContacts();

      return successResponse(res, 'Data panduan berkemah berhasil diambil.', {
        evacuation_map_url: formatImageUrl(req, configs.evacuation_map_url || '/uploads/maps/evacuation_map.png'),
        etiquette_summary: {
          title: configs.etiquette_title || 'Etika Berkemah di Bedengan',
          description: configs.etiquette_description || 'Jaga kelestarian alam dan hormati sesama penikmat alam.'
        },
        rules,
        warnings,
        etiquette,
        emergency_contacts: emergencyContacts
      });
    } catch (error) {
      console.error('[Guide Error]', error);
      return errorResponse(res, 'Gagal mengambil data panduan.', 500, error.message);
    }
  },

  // --- CRUD RULES & WARNINGS ---
  createRule: async (req, res) => {
    try {
      const { type, title, description, icon_name, display_order } = req.body;

      if (isEmpty(type) || isEmpty(title)) {
        return errorResponse(res, 'Field type dan title wajib diisi!', 400);
      }

      const typeVal = validateEnum(type, ['rule', 'warning', 'etiquette'], 'Tipe aturan');
      if (!typeVal.isValid) {
        return errorResponse(res, typeVal.error, 400);
      }

      const titleCheck = validateLength(title, 150, 'Judul aturan');
      if (!titleCheck.isValid) return errorResponse(res, titleCheck.error, 400);

      const newRule = await GuideModel.createRule({
        type: typeVal.value,
        title: String(title).trim(),
        description: description || '',
        icon_name: icon_name || 'info',
        display_order: parseInt(display_order, 10) || 0
      });

      return successResponse(res, 'Aturan/panduan berhasil ditambahkan.', newRule, 201);
    } catch (error) {
      return errorResponse(res, 'Gagal menambahkan aturan.', 500, error.message);
    }
  },

  updateRule: async (req, res) => {
    try {
      const { id } = req.params;

      const old = await GuideModel.findRuleById(id);
      if (!old) {
        return errorResponse(res, 'Data aturan tidak ditemukan.', 404);
      }

      let type = old.type;
      if (req.body.type !== undefined) {
        const typeVal = validateEnum(req.body.type, ['rule', 'warning', 'etiquette'], 'Tipe aturan');
        if (!typeVal.isValid) return errorResponse(res, typeVal.error, 400);
        type = typeVal.value;
      }

      let title = old.title;
      if (req.body.title !== undefined) {
        if (isEmpty(req.body.title)) return errorResponse(res, 'Judul tidak boleh kosong!', 400);
        const titleCheck = validateLength(req.body.title, 150, 'Judul aturan');
        if (!titleCheck.isValid) return errorResponse(res, titleCheck.error, 400);
        title = String(req.body.title).trim();
      }

      const description = req.body.description !== undefined ? req.body.description : old.description;
      const icon_name = req.body.icon_name !== undefined ? req.body.icon_name : old.icon_name;
      const display_order = req.body.display_order !== undefined ? parseInt(req.body.display_order, 10) || 0 : old.display_order;

      const updated = await GuideModel.updateRule(id, {
        type,
        title,
        description,
        icon_name,
        display_order
      });

      return successResponse(res, 'Aturan/panduan berhasil diperbarui.', updated);
    } catch (error) {
      return errorResponse(res, 'Gagal memperbarui aturan.', 500, error.message);
    }
  },

  deleteRule: async (req, res) => {
    try {
      const { id } = req.params;

      const existing = await GuideModel.findRuleById(id);
      if (!existing) {
        return errorResponse(res, 'Data aturan tidak ditemukan.', 404);
      }

      await GuideModel.deleteRule(id);

      return successResponse(res, `Aturan '${existing.title}' berhasil dihapus.`);
    } catch (error) {
      return errorResponse(res, 'Gagal menghapus aturan.', 500, error.message);
    }
  },

  // --- CRUD EMERGENCY CONTACTS ---
  createContact: async (req, res) => {
    try {
      const { title, phone_number, location_detail, icon_name } = req.body;

      if (isEmpty(title) || isEmpty(phone_number)) {
        return errorResponse(res, 'Field title dan phone_number wajib diisi!', 400);
      }

      const titleCheck = validateLength(title, 100, 'Nama instansi/kontak');
      if (!titleCheck.isValid) return errorResponse(res, titleCheck.error, 400);

      // Validasi Nomor Telepon Darurat (Seluler & Darat) - Poin Revisi 2
      const phoneVal = validatePhone(phone_number, {
        allowLandline: true,
        fieldName: 'Nomor telepon kontak darurat'
      });
      if (!phoneVal.isValid) {
        return errorResponse(res, phoneVal.error, 400);
      }

      const newContact = await GuideModel.createContact({
        title: String(title).trim(),
        phone_number: phoneVal.normalized,
        location_detail: location_detail || '',
        icon_name: icon_name || 'phone'
      });

      return successResponse(res, 'Kontak darurat berhasil ditambahkan.', newContact, 201);
    } catch (error) {
      return errorResponse(res, 'Gagal menambahkan kontak darurat.', 500, error.message);
    }
  },

  updateContact: async (req, res) => {
    try {
      const { id } = req.params;

      const old = await GuideModel.findContactById(id);
      if (!old) {
        return errorResponse(res, 'Kontak darurat tidak ditemukan.', 404);
      }

      let title = old.title;
      if (req.body.title !== undefined) {
        if (isEmpty(req.body.title)) return errorResponse(res, 'Judul kontak tidak boleh kosong!', 400);
        const titleCheck = validateLength(req.body.title, 100, 'Nama instansi/kontak');
        if (!titleCheck.isValid) return errorResponse(res, titleCheck.error, 400);
        title = String(req.body.title).trim();
      }

      let phone_number = old.phone_number;
      if (req.body.phone_number !== undefined) {
        const phoneVal = validatePhone(req.body.phone_number, {
          allowLandline: true,
          fieldName: 'Nomor telepon kontak darurat'
        });
        if (!phoneVal.isValid) return errorResponse(res, phoneVal.error, 400);
        phone_number = phoneVal.normalized;
      }

      const location_detail = req.body.location_detail !== undefined ? req.body.location_detail : old.location_detail;
      const icon_name = req.body.icon_name !== undefined ? req.body.icon_name : old.icon_name;

      const updated = await GuideModel.updateContact(id, {
        title,
        phone_number,
        location_detail,
        icon_name
      });

      return successResponse(res, 'Kontak darurat berhasil diperbarui.', updated);
    } catch (error) {
      return errorResponse(res, 'Gagal memperbarui kontak darurat.', 500, error.message);
    }
  },

  deleteContact: async (req, res) => {
    try {
      const { id } = req.params;

      const existing = await GuideModel.findContactById(id);
      if (!existing) {
        return errorResponse(res, 'Kontak darurat tidak ditemukan.', 404);
      }

      await GuideModel.deleteContact(id);

      return successResponse(res, `Kontak '${existing.title}' berhasil dihapus.`);
    } catch (error) {
      return errorResponse(res, 'Gagal menghapus kontak darurat.', 500, error.message);
    }
  }
};

module.exports = guideController;