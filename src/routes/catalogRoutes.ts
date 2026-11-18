import { Router } from 'express';
import catalogController from '../controllers/catalogController';
import authMiddleware from '../middlewares/authMiddleware';
import { handleUploadFields } from '../middlewares/uploadMiddleware';

const router = Router();

// Konfigurasi upload multiple fields untuk banner utama & item_images
const catalogUpload = handleUploadFields([
  { name: 'image', maxCount: 1 },
  { name: 'item_images', maxCount: 20 }
]);

// Public routes
router.get('/', catalogController.getAllCatalogs);
router.get('/:id', catalogController.getCatalogDetail);

// Pengajuan publik (opsional jika mitra warga mendaftar mandiri)
router.post('/apply', catalogUpload, catalogController.createCatalog);

// Protected routes (Admin only)
router.post('/', authMiddleware, catalogUpload, catalogController.createCatalog);
router.put('/:id', authMiddleware, catalogUpload, catalogController.updateCatalog);
router.delete('/:id', authMiddleware, catalogController.deleteCatalog);

export default router;

