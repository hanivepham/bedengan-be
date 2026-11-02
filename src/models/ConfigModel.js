const pool = require('../config/db');

/**
 * Data Access Layer (DAL) untuk Tabel site_configs
 */
const ConfigModel = {
  getAll: async () => {
    const [rows] = await pool.query('SELECT config_key, config_value FROM site_configs');
    const configs = {};
    rows.forEach((row) => {
      configs[row.config_key] = row.config_value;
    });
    return configs;
  },

  getByKeys: async (keysArray) => {
    if (!keysArray || keysArray.length === 0) return {};
    const placeholders = keysArray.map(() => '?').join(', ');
    const [rows] = await pool.query(
      `SELECT config_key, config_value FROM site_configs WHERE config_key IN (${placeholders})`,
      keysArray
    );
    const configs = {};
    rows.forEach((row) => {
      configs[row.config_key] = row.config_value;
    });
    return configs;
  },

  upsert: async (key, value) => {
    await pool.query(
      `INSERT INTO site_configs (config_key, config_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
      [key, String(value)]
    );
  },

  upsertMany: async (configsObject) => {
    for (const [key, value] of Object.entries(configsObject)) {
      await ConfigModel.upsert(key, value);
    }
    return ConfigModel.getAll();
  }
};

module.exports = ConfigModel;