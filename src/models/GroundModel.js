const pool = require('../config/db');

/**
 * Data Access Layer (DAL) untuk Tabel grounds
 */
const GroundModel = {
  findAll: async () => {
    const [rows] = await pool.query('SELECT * FROM grounds ORDER BY code ASC');
    return rows;
  },

  findById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM grounds WHERE id = ?', [id]);
    return rows[0] || null;
  },

  findByCodeOrId: async (identifier) => {
    const isNum = !isNaN(identifier);
    const numId = isNum ? parseInt(identifier, 10) : -1;
    const [rows] = await pool.query(
      'SELECT * FROM grounds WHERE UPPER(code) = UPPER(?) OR id = ? LIMIT 1',
      [identifier, numId]
    );
    return rows[0] || null;
  },

  findByCode: async (code) => {
    const [rows] = await pool.query(
      'SELECT id FROM grounds WHERE UPPER(code) = UPPER(?)',
      [String(code).trim()]
    );
    return rows[0] || null;
  },

  findConflictCode: async (code, excludeId) => {
    const [rows] = await pool.query(
      'SELECT id FROM grounds WHERE code = ? AND id != ?',
      [String(code).trim().toUpperCase(), excludeId]
    );
    return rows[0] || null;
  },

  create: async (data) => {
    const [result] = await pool.query(
      `INSERT INTO grounds (
        code, name, capacity_badge, description, area_size, terrain_feature,
        nearby_facility, toilet_distance, highlight_text, highlight_theme, image_url, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.code,
        data.name,
        data.capacity_badge,
        data.description || '',
        data.area_size || '',
        data.terrain_feature || '',
        data.nearby_facility || '',
        data.toilet_distance || '',
        data.highlight_text || '',
        data.highlight_theme || 'green',
        data.image_url || null,
        data.is_active !== undefined ? data.is_active : 1
      ]
    );

    return GroundModel.findById(result.insertId);
  },

  update: async (id, data) => {
    await pool.query(
      `UPDATE grounds SET
        code = ?, name = ?, capacity_badge = ?, description = ?, area_size = ?,
        terrain_feature = ?, nearby_facility = ?, toilet_distance = ?,
        highlight_text = ?, highlight_theme = ?, image_url = ?, is_active = ?
      WHERE id = ?`,
      [
        data.code,
        data.name,
        data.capacity_badge,
        data.description,
        data.area_size,
        data.terrain_feature,
        data.nearby_facility,
        data.toilet_distance,
        data.highlight_text,
        data.highlight_theme,
        data.image_url,
        data.is_active,
        id
      ]
    );

    return GroundModel.findById(id);
  },

  delete: async (id) => {
    const [result] = await pool.query('DELETE FROM grounds WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  countActive: async () => {
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM grounds WHERE is_active = TRUE');
    return rows[0].count;
  },

  countAll: async () => {
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM grounds');
    return rows[0].count;
  }
};

module.exports = GroundModel;