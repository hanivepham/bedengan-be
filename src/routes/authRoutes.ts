import { Router } from 'express';
import authController from '../controllers/authController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();

// Public
router.post('/login', authController.login);

// Protected (Admin)
router.get('/me', authMiddleware, authController.getMe);
router.put('/profile', authMiddleware, authController.updateProfile);

export default router;

