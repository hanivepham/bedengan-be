import { Router } from 'express';
import groundController from '../controllers/groundController';
import authMiddleware from '../middlewares/authMiddleware';
import { handleUpload } from '../middlewares/uploadMiddleware';

const router = Router();

// Public routes
router.get('/', groundController.getAllGrounds);
router.get('/:code', groundController.getGroundDetail);

// Protected routes (Admin only)
router.post('/', authMiddleware, handleUpload('image'), groundController.createGround);
router.put('/:id', authMiddleware, handleUpload('image'), groundController.updateGround);
router.delete('/:id', authMiddleware, groundController.deleteGround);

export default router;

