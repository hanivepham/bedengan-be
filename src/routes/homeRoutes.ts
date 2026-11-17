import { Router } from 'express';
import homeController from '../controllers/homeController';
import authMiddleware from '../middlewares/authMiddleware';
import { handleUpload } from '../middlewares/uploadMiddleware';

const router = Router();

// Public routes
router.get('/', homeController.getHomeData);
router.post('/reviews', homeController.createReview);

// Protected routes (Admin only)
router.get('/dashboard', authMiddleware, homeController.getDashboardStats);
router.delete('/reviews/:id', authMiddleware, homeController.deleteReview);
router.put('/configs', authMiddleware, homeController.updateConfigs);
router.post('/configs/upload-map', authMiddleware, handleUpload('map_image'), homeController.uploadMapImage);

export default router;

