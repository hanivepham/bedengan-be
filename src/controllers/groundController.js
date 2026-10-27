const pool = require('../config/db');
const { successResponse, errorResponse, formatImageUrl } = require('../utils/responseHelper');

/**
 * Controller untuk Manajemen Zona Perkemahan (Grounds A-M)
 */
const groundController = {
  // GET /api/grounds (Public)
  getAllGrounds: async (req, res) => {
    try {
      // Ambil site_configs terkait peta dan etika
      const [configRows] = await pool.query(
        "SELECT config_key, config_value FROM site_configs WHERE config_key IN ('overall_ground_map_url', 'etiquette_title', 'etiquette_description')"
      );

      const configs = {};
      configRows.forEach((row) => {
        configs[row.config_key] = row.config_value;
      });

      // Ambil data grounds terurut code ASC
      const [grounds] = await pool.query(
        'SELECT * FROM grounds ORDER BY code ASC'
      );

      const formattedGrounds = grounds.map((g) => {
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
      });

      return successResponse(res, 'Daftar zona perkemahan berhasil diambil.', {
        overall_map_url: formatImageUrl(req, configs.overall_ground_map_url || '/uploads/maps/bedengan_map.png'),
        etiquette: {
          title: configs.etiquette_title || 'Etika Berkemah di Bedengan',
          description: configs.etiquette_description || 'Jaga kelestarian alam hutan pinus Bedengan.'
        },
        grounds: formattedGrounds
      });
    } catch (error) {
      console.error('[Grounds Error]', error);
      return errorResponse(res, 'Gagal mengambil data zona perkemahan.', 500, error.message);
    }
  },

  // GET /api/grounds/:code (Public - bisa code 'A' atau ID numerik)
  getGroundDetail: async (req, res) => {
    try {
      const { code } = req.params;

      const [rows] = await pool.query(
        'SELECT * FROM grounds WHERE UPPER(code) = UPPER(?) OR id = ? LIMIT 1',
        [code, isNaN(code) ? -1 : parseInt(code, 10)]
      );

      if (rows.length === 0) {
        return errorResponse(res, `Ground dengan kode atau ID '${code}' tidak ditemukan.`, 404);
      }

      const g = rows[0];
      const fullImageUrl = formatImageUrl(req, g.image_url);

      const formattedGround = {
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

      return successResponse(res, 'Detail ground berhasil diambil.', formattedGround);
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

      if (!code || !name || !capacity_badge) {
        return errorResponse(res, 'Field code, name, dan capacity_badge wajib diisi!', 400);
      }

      // Periksa duplikasi kode
      const [existing] = await pool.query('SELECT id FROM grounds WHERE UPPER(code) = UPPER(?)', [code.trim()]);
      if (existing.length > 0) {
        return errorResponse(res, `Kode ground '${code}' sudah digunakan!`, 400);
      }

      let imageUrl = null;
      if (req.file) {
        imageUrl = `/uploads/grounds/${req.file.filename}`;
      } else if (req.body.image_url) {
        imageUrl = req.body.image_url;
      }

      const [result] = await pool.query(
        `INSERT INTO grounds (
          code, name, capacity_badge, description, area_size, terrain_feature,
          nearby_facility, toilet_distance, highlight_text, highlight_theme, image_url, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code.trim().toUpperCase(),
          name.trim(),
          capacity_badge.trim(),
          description || '',
          area_size || '',
          terrain_feature || '',
          nearby_facility || '',
          toilet_distance || '',
          highlight_text || '',
          highlight_theme || 'green',
          imageUrl,
          is_active !== undefined ? (is_active === 'false' || is_active === false ? 0 : 1) : 1
        ]
      );

      const [newGroundRows] = await pool.query('SELECT * FROM grounds WHERE id = ?', [result.insertId]);
      const newGround = newGroundRows[0];

      return successResponse(
        res,
        'Zona perkemahan baru berhasil ditambahkan.',
        {
          ...newGround,
          is_active: Boolean(newGround.is_active),
          image_url: formatImageUrl(req, newGround.image_url),
          specs: {
            area_size: newGround.area_size || '',
            terrain_feature: newGround.terrain_feature || '',
            nearby_facility: newGround.nearby_facility || '',
            toilet_distance: newGround.toilet_distance || ''
          }
        },
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

      const [rows] = await pool.query('SELECT * FROM grounds WHERE id = ?', [id]);
      if (rows.length === 0) {
        return errorResponse(res, 'Ground tidak ditemukan.', 404);
      }

      const oldGround = rows[0];

      const code = req.body.code !== undefined ? req.body.code.trim().toUpperCase() : oldGround.code;
      const name = req.body.name !== undefined ? req.body.name.trim() : oldGround.name;
      const capacity_badge = req.body.capacity_badge !== undefined ? req.body.capacity_badge.trim() : oldGround.capacity_badge;
      const description = req.body.description !== undefined ? req.body.description : oldGround.description;
      const area_size = req.body.area_size !== undefined ? req.body.area_size : oldGround.area_size;
      const terrain_feature = req.body.terrain_feature !== undefined ? req.body.terrain_feature : oldGround.terrain_feature;
      const nearby_facility = req.body.nearby_facility !== undefined ? req.body.nearby_facility : oldGround.nearby_facility;
      const toilet_distance = req.body.toilet_distance !== undefined ? req.body.toilet_distance : oldGround.toilet_distance;
      const highlight_text = req.body.highlight_text !== undefined ? req.body.highlight_text : oldGround.highlight_text;
      const highlight_theme = req.body.highlight_theme !== undefined ? req.body.highlight_theme : oldGround.highlight_theme;

      let is_active = oldGround.is_active;
      if (req.body.is_active !== undefined) {
        is_active = (req.body.is_active === 'false' || req.body.is_active === false || req.body.is_active === 0 || req.body.is_active === '0') ? 0 : 1;
      }

      let imageUrl = oldGround.image_url;
      if (req.file) {
        imageUrl = `/uploads/grounds/${req.file.filename}`;
      } else if (req.body.image_url !== undefined) {
        imageUrl = req.body.image_url;
      }

      // Periksa jika kode diubah dan kode baru sudah dipakai di baris lain
      if (code !== oldGround.code) {
        const [conflict] = await pool.query('SELECT id FROM grounds WHERE code = ? AND id != ?', [code, id]);
        if (conflict.length > 0) {
          return errorResponse(res, `Kode ground '${code}' sudah dipakai oleh zona lain!`, 400);
        }
      }

      await pool.query(
        `UPDATE grounds SET
          code = ?, name = ?, capacity_badge = ?, description = ?, area_size = ?,
          terrain_feature = ?, nearby_facility = ?, toilet_distance = ?,
          highlight_text = ?, highlight_theme = ?, image_url = ?, is_active = ?
        WHERE id = ?`,
        [
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
          imageUrl,
          is_active,
          id
        ]
      );

      const [updatedRows] = await pool.query('SELECT * FROM grounds WHERE id = ?', [id]);
      const updatedGround = updatedRows[0];

      return successResponse(res, 'Data zona perkemahan berhasil diperbarui.', {
        ...updatedGround,
        is_active: Boolean(updatedGround.is_active),
        image_url: formatImageUrl(req, updatedGround.image_url),
        specs: {
          area_size: updatedGround.area_size || '',
          terrain_feature: updatedGround.terrain_feature || '',
          nearby_facility: updatedGround.nearby_facility || '',
          toilet_distance: updatedGround.toilet_distance || ''
        }
      });
    } catch (error) {
      console.error('[Update Ground Error]', error);
      return errorResponse(res, 'Gagal memperbarui ground.', 500, error.message);
    }
  },

  // DELETE /api/grounds/:id (Protected)
  deleteGround: async (req, res) => {
    try {
      const { id } = req.params;

      const [rows] = await pool.query('SELECT * FROM grounds WHERE id = ?', [id]);
      if (rows.length === 0) {
        return errorResponse(res, 'Ground tidak ditemukan.', 404);
      }

      await pool.query('DELETE FROM grounds WHERE id = ?', [id]);

      return successResponse(res, `Ground '${rows[0].name}' (${rows[0].code}) berhasil dihapus.`);
    } catch (error) {
      return errorResponse(res, 'Gagal menghapus ground.', 500, error.message);
    }
  }
};

module.exports = groundController;
