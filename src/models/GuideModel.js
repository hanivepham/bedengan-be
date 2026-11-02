const pool = require('../config/db');

/**
 * Data Access Layer (DAL) untuk Tabel rules dan emergency_contacts
 */
const GuideModel = {
  // --- RULES ---
  findAllRules: async () => {
    const [rows] = await pool.query('SELECT * FROM rules ORDER BY display_order ASC, id ASC');
    return rows;
  },

  findRuleById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM rules WHERE id = ?', [id]);
    return rows[0] || null;
  },

  createRule: async (data) => {
    const [result] = await pool.query(
      'INSERT INTO rules (type, title, description, icon_name, display_order) VALUES (?, ?, ?, ?, ?)',
      [data.type, data.title, data.description || '', data.icon_name || 'info', data.display_order || 0]
    );
    return GuideModel.findRuleById(result.insertId);
  },

  updateRule: async (id, data) => {
    await pool.query(
      'UPDATE rules SET type = ?, title = ?, description = ?, icon_name = ?, display_order = ? WHERE id = ?',
      [data.type, data.title, data.description, data.icon_name, data.display_order, id]
    );
    return GuideModel.findRuleById(id);
  },

  deleteRule: async (id) => {
    const [result] = await pool.query('DELETE FROM rules WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  // --- EMERGENCY CONTACTS ---
  findAllContacts: async () => {
    const [rows] = await pool.query('SELECT * FROM emergency_contacts ORDER BY id ASC');
    return rows;
  },

  findContactById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM emergency_contacts WHERE id = ?', [id]);
    return rows[0] || null;
  },

  createContact: async (data) => {
    const [result] = await pool.query(
      'INSERT INTO emergency_contacts (title, phone_number, location_detail, icon_name) VALUES (?, ?, ?, ?)',
      [data.title, data.phone_number, data.location_detail || '', data.icon_name || 'phone']
    );
    return GuideModel.findContactById(result.insertId);
  },

  updateContact: async (id, data) => {
    await pool.query(
      'UPDATE emergency_contacts SET title = ?, phone_number = ?, location_detail = ?, icon_name = ? WHERE id = ?',
      [data.title, data.phone_number, data.location_detail, data.icon_name, id]
    );
    return GuideModel.findContactById(id);
  },

  deleteContact: async (id) => {
    const [result] = await pool.query('DELETE FROM emergency_contacts WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = GuideModel;