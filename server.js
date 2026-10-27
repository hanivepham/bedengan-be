require('dotenv').config();
const app = require('./src/app');
const pool = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// Verifikasi koneksi database dengan mekanisme auto-retry
async function connectWithRetry(maxRetries = 5, delay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const connection = await pool.getConnection();
      console.log('----------------------------------------------------');
      console.log(`[DATABASE] Berhasil terhubung ke MySQL (${process.env.DB_NAME || 'db_bedengan'})`);
      connection.release();
      return true;
    } catch (error) {
      console.warn(`[DATABASE] Percobaan koneksi ${attempt}/${maxRetries} gagal: ${error.message}`);
      if (attempt < maxRetries) {
        console.log(`[DATABASE] Menunggu ${delay / 1000} detik sebelum mencoba kembali...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

async function startServer() {
  try {
    await connectWithRetry();

    app.listen(PORT, () => {
      console.log(`[SERVER] Bedengan Xplore REST API aktif di: http://localhost:${PORT}`);
      console.log(`[DOCS] Endpoint Utama: http://localhost:${PORT}/`);
      console.log('----------------------------------------------------');
    });
  } catch (error) {
    console.error('----------------------------------------------------');
    console.error('[DATABASE ERROR] Gagal terhubung ke MySQL:', error.message);
    console.error('Pastikan layanan MySQL di Laragon/XAMPP sudah dalam kondisi Start.');
    console.error('----------------------------------------------------');
  }
}

startServer();
