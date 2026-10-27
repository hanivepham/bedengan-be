const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Fungsi pembantu untuk menentukan folder penyimpanan
const getDestination = (req, file, cb) => {
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
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedOriginal = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${sanitizedOriginal}_${uniqueSuffix}${ext}`);
  }
});

// Filter jenis file (hanya gambar)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung. Hanya gambar dengan format .jpg, .jpeg, .png, atau .webp yang diperbolehkan!'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter
});

// Middleware wrapper untuk menangani error multer secara ramah JSON
const handleUpload = (fieldName) => {
  return (req, res, next) => {
    const uploadSingle = upload.single(fieldName);
    uploadSingle(req, res, (err) => {
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
      next();
    });
  };
};

module.exports = {
  upload,
  handleUpload
};
