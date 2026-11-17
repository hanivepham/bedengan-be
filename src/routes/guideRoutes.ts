import { Router } from 'express';
import guideController from '../controllers/guideController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();

// Public route
router.get('/', guideController.getGuidesData);

// Rules & Warnings (Protected)
router.post('/rules', authMiddleware, guideController.createRule);
router.put('/rules/:id', authMiddleware, guideController.updateRule);
router.delete('/rules/:id', authMiddleware, guideController.deleteRule);

// Emergency Contacts (Protected)
router.post('/contacts', authMiddleware, guideController.createContact);
router.put('/contacts/:id', authMiddleware, guideController.updateContact);
router.delete('/contacts/:id', authMiddleware, guideController.deleteContact);

export default router;

