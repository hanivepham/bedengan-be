import { Router } from 'express';
import catalogController from '../controllers/catalogController';
import authMiddleware from '../middlewares/authMiddleware';
import { handleUpload } from '../middlewares/uploadMiddleware';

const router = Router();

// Public routes
router.get('/', catalogController.getAllCatalogs);
router.get('/:id', catalogController.getCatalogDetail);

// Pengajuan publik (opsional jika mitra warga mendaftar mandiri)
router.post('/apply', handleUpload('image'), catalogController.createCatalog);

// Protected routes (Admin only)
router.post('/', authMiddleware, handleUpload('image'), catalogController.createCatalog);
router.put('/:id', authMiddleware, handleUpload('image'), catalogController.updateCatalog);
router.delete('/:id', authMiddleware, catalogController.deleteCatalog);

export default router;

