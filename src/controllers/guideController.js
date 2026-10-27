const pool = require('../config/db');
const { successResponse, errorResponse, formatImageUrl } = require('../utils/responseHelper');

/**
 * Controller untuk Panduan Berkemah, Aturan, Peringatan, Etika, dan Kontak Darurat
 */
const guideController = {
  // GET /api/guides (Public)
  getGuidesData: async (req, res) => {
    try {
      // Ambil site configs terkait peta evakuasi dan etika
      const [configRows] = await pool.query(
        "SELECT config_key, config_value FROM site_configs WHERE config_key IN ('evacuation_map_url', 'etiquette_title', 'etiquette_description')"
      );

      const configs = {};
      configRows.forEach((row) => {
        configs[row.config_key] = row.config_value;
      });

      // Ambil seluruh aturan dikelompokkan
      const [allRules] = await pool.query('SELECT * FROM rules ORDER BY display_order ASC, id ASC');

      const rules = allRules.filter((r) => r.type === 'rule');
      const warnings = allRules.filter((r) => r.type === 'warning');
      const etiquette = allRules.filter((r) => r.type === 'etiquette');

      // Ambil kontak darurat
      const [emergencyContacts] = await pool.query('SELECT * FROM emergency_contacts ORDER BY id ASC');

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

      if (!type || !title) {
        return errorResponse(res, 'Field type dan title wajib diisi!', 400);
      }

      if (!['rule', 'warning', 'etiquette'].includes(type)) {
        return errorResponse(res, "Type harus salah satu dari: 'rule', 'warning', 'etiquette'.", 400);
      }

      const [result] = await pool.query(
        'INSERT INTO rules (type, title, description, icon_name, display_order) VALUES (?, ?, ?, ?, ?)',
        [type, title.trim(), description || '', icon_name || 'info', display_order || 0]
      );

      const [newRule] = await pool.query('SELECT * FROM rules WHERE id = ?', [result.insertId]);

      return successResponse(res, 'Aturan/panduan berhasil ditambahkan.', newRule[0], 201);
    } catch (error) {
      return errorResponse(res, 'Gagal menambahkan aturan.', 500, error.message);
    }
  },

  updateRule: async (req, res) => {
    try {
      const { id } = req.params;

      const [existing] = await pool.query('SELECT * FROM rules WHERE id = ?', [id]);
      if (existing.length === 0) {
        return errorResponse(res, 'Data aturan tidak ditemukan.', 404);
      }

      const old = existing[0];
      const type = req.body.type || old.type;
      const title = req.body.title ? req.body.title.trim() : old.title;
      const description = req.body.description !== undefined ? req.body.description : old.description;
      const icon_name = req.body.icon_name !== undefined ? req.body.icon_name : old.icon_name;
      const display_order = req.body.display_order !== undefined ? req.body.display_order : old.display_order;

      await pool.query(
        'UPDATE rules SET type = ?, title = ?, description = ?, icon_name = ?, display_order = ? WHERE id = ?',
        [type, title, description, icon_name, display_order, id]
      );

      const [updated] = await pool.query('SELECT * FROM rules WHERE id = ?', [id]);

      return successResponse(res, 'Aturan/panduan berhasil diperbarui.', updated[0]);
    } catch (error) {
      return errorResponse(res, 'Gagal memperbarui aturan.', 500, error.message);
    }
  },

  deleteRule: async (req, res) => {
    try {
      const { id } = req.params;

      const [existing] = await pool.query('SELECT * FROM rules WHERE id = ?', [id]);
      if (existing.length === 0) {
        return errorResponse(res, 'Data aturan tidak ditemukan.', 404);
      }

      await pool.query('DELETE FROM rules WHERE id = ?', [id]);

      return successResponse(res, `Aturan '${existing[0].title}' berhasil dihapus.`);
    } catch (error) {
      return errorResponse(res, 'Gagal menghapus aturan.', 500, error.message);
    }
  },

  // --- CRUD EMERGENCY CONTACTS ---
  createContact: async (req, res) => {
    try {
      const { title, phone_number, location_detail, icon_name } = req.body;

      if (!title || !phone_number) {
        return errorResponse(res, 'Field title dan phone_number wajib diisi!', 400);
      }

      const [result] = await pool.query(
        'INSERT INTO emergency_contacts (title, phone_number, location_detail, icon_name) VALUES (?, ?, ?, ?)',
        [title.trim(), phone_number.trim(), location_detail || '', icon_name || 'phone']
      );

      const [newContact] = await pool.query('SELECT * FROM emergency_contacts WHERE id = ?', [result.insertId]);

      return successResponse(res, 'Kontak darurat berhasil ditambahkan.', newContact[0], 201);
    } catch (error) {
      return errorResponse(res, 'Gagal menambahkan kontak darurat.', 500, error.message);
    }
  },

  updateContact: async (req, res) => {
    try {
      const { id } = req.params;

      const [existing] = await pool.query('SELECT * FROM emergency_contacts WHERE id = ?', [id]);
      if (existing.length === 0) {
        return errorResponse(res, 'Kontak darurat tidak ditemukan.', 404);
      }

      const old = existing[0];
      const title = req.body.title ? req.body.title.trim() : old.title;
      const phone_number = req.body.phone_number ? req.body.phone_number.trim() : old.phone_number;
      const location_detail = req.body.location_detail !== undefined ? req.body.location_detail : old.location_detail;
      const icon_name = req.body.icon_name !== undefined ? req.body.icon_name : old.icon_name;

      await pool.query(
        'UPDATE emergency_contacts SET title = ?, phone_number = ?, location_detail = ?, icon_name = ? WHERE id = ?',
        [title, phone_number, location_detail, icon_name, id]
      );

      const [updated] = await pool.query('SELECT * FROM emergency_contacts WHERE id = ?', [id]);

      return successResponse(res, 'Kontak darurat berhasil diperbarui.', updated[0]);
    } catch (error) {
      return errorResponse(res, 'Gagal memperbarui kontak darurat.', 500, error.message);
    }
  },

  deleteContact: async (req, res) => {
    try {
      const { id } = req.params;

      const [existing] = await pool.query('SELECT * FROM emergency_contacts WHERE id = ?', [id]);
      if (existing.length === 0) {
        return errorResponse(res, 'Kontak darurat tidak ditemukan.', 404);
      }

      await pool.query('DELETE FROM emergency_contacts WHERE id = ?', [id]);

      return successResponse(res, `Kontak '${existing[0].title}' berhasil dihapus.`);
    } catch (error) {
      return errorResponse(res, 'Gagal menghapus kontak darurat.', 500, error.message);
    }
  }
};

module.exports = guideController;
