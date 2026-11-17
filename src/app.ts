import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

dotenv.config();

// Import rute-rute
import authRoutes from './routes/authRoutes';
import groundRoutes from './routes/groundRoutes';
import catalogRoutes from './routes/catalogRoutes';
import guideRoutes from './routes/guideRoutes';
import homeRoutes from './routes/homeRoutes';
import aiRoutes from './routes/aiRoutes';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10) || 5000;
app.set('port', PORT);

// Keamanan dan Headers
app.use(
  helmet({
    crossOriginResourcePolicy: false // Memperbolehkan akses cross-origin untuk file gambar static di Next.js & Flutter
  })
);

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Folder Statis untuk Uploads (Gambar Grounds, Catalogs, Maps)
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
app.use('/uploads', express.static(path.join(__dirname, '..', uploadDir)));

// Health Check & Root Info
app.get('/', (req: Request, res: Response) => {
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
app.use('/grounds', groundRoutes);
app.use('/api/catalogs', catalogRoutes);
app.use('/catalogs', catalogRoutes);
app.use('/api/rentals', (req: Request | any, res: Response, next: NextFunction) => {
  req.query.category = 'rental';
  return catalogRoutes(req, res, next);
});
app.use('/rentals', (req: Request | any, res: Response, next: NextFunction) => {
  req.query.category = 'rental';
  return catalogRoutes(req, res, next);
});
app.use('/api/guides', guideRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/chat', aiRoutes);
app.use('/api/ai', aiRoutes);

// 404 Handler untuk route yang tidak ditemukan
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Rute '${req.method} ${req.originalUrl}' tidak ditemukan pada server API Bedengan Xplore.`
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Error]', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Terjadi kesalahan internal pada server.';

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;

