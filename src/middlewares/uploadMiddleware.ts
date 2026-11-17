import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Fungsi pembantu untuk menentukan folder penyimpanan
const getDestination = (req: Request | any, file: any, cb: (error: Error | null, destination: string) => void) => {
  let subfolder = 'grounds';

  if (req.baseUrl.includes('catalogs')) {
    subfolder = 'catalogs';
  } else if (req.baseUrl.includes('maps') || req.baseUrl.includes('configs') || req.baseUrl.includes('home')) {
    subfolder = 'maps';
  } else if (req.baseUrl.includes('grounds')) {
    subfolder = 'grounds';
  }

  const uploadPath = path.join(__dirname, '..', '..', 'uploads', subfolder);

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  cb(null, uploadPath);
};

// Konfigurasi penyimpanan disk
const storage = multer.diskStorage({
  destination: getDestination,
  filename: (req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedOriginal = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${sanitizedOriginal}_${uniqueSuffix}${ext}`);
  }
});

// Filter jenis file (hanya gambar)
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Format file tidak didukung. Hanya gambar dengan format .jpg, .jpeg, .png, atau .webp yang diperbolehkan!'
      ),
      false
    );
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter
});

// Middleware wrapper untuk menangani error multer secara ramah JSON
export const handleUpload = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadSingle = upload.single(fieldName);
    uploadSingle(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            status: 'error',
            message: 'Ukuran file terlalu besar! Maksimal ukuran file adalah 5MB.'
          });
        }
        return res.status(400).json({
          status: 'error',
          message: `Kesalahan unggah file: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          status: 'error',
          message: err.message
        });
      }
      // Jika tidak ada file diunggah atau unggah berhasil, lanjutkan ke controller
      next();
    });
  };
};

export default {
  upload,
  handleUpload
};

