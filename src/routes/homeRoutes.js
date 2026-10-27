const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const authMiddleware = require('../middlewares/authMiddleware');
const { handleUpload } = require('../middlewares/uploadMiddleware');

// Public routes
router.get('/', homeController.getHomeData);
router.post('/reviews', homeController.createReview);

// Protected routes (Admin only)
router.get('/dashboard', authMiddleware, homeController.getDashboardStats);
router.delete('/reviews/:id', authMiddleware, homeController.deleteReview);
router.put('/configs', authMiddleware, homeController.updateConfigs);
router.post('/configs/upload-map', authMiddleware, handleUpload('map_image'), homeController.uploadMapImage);

module.exports = router;
