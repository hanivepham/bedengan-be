const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');
const authMiddleware = require('../middlewares/authMiddleware');
const { handleUpload } = require('../middlewares/uploadMiddleware');

// Public routes
router.get('/', catalogController.getAllCatalogs);
router.get('/:id', catalogController.getCatalogDetail);

// Pengajuan publik (opsional jika mitra warga mendaftar mandiri)
router.post('/apply', handleUpload('image'), catalogController.createCatalog);

// Protected routes (Admin only)
router.post('/', authMiddleware, handleUpload('image'), catalogController.createCatalog);
router.put('/:id', authMiddleware, handleUpload('image'), catalogController.updateCatalog);
router.delete('/:id', authMiddleware, catalogController.deleteCatalog);

module.exports = router;
