const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import rute-rute
const authRoutes = require('./routes/authRoutes');
const groundRoutes = require('./routes/groundRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const guideRoutes = require('./routes/guideRoutes');
const homeRoutes = require('./routes/homeRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

// Keamanan dan Headers
app.use(
  helmet({
    crossOriginResourcePolicy: false // Memperbolehkan akses cross-origin untuk file gambar static di Next.js & Flutter
  })
);

// CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Folder Statis untuk Uploads (Gambar Grounds, Catalogs, Maps)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health Check & Root Info
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Selamat datang di REST API Resmi Bedengan Xplore!',
    version: '1.0.0',
    documentation: {
      auth: '/api/auth',
      grounds: '/api/grounds',
      catalogs: '/api/catalogs',
      guides: '/api/guides',
      home: '/api/home',
      chat: '/api/chat',
      ai: '/api/ai/chat'
    }
  });
});

// Registrasi Route Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/grounds', groundRoutes);
app.use('/api/catalogs', catalogRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/chat', aiRoutes);
app.use('/api/ai', aiRoutes);

// 404 Handler untuk route yang tidak ditemukan
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Rute '${req.method} ${req.originalUrl}' tidak ditemukan pada server API Bedengan Xplore.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Terjadi kesalahan internal pada server.';

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
