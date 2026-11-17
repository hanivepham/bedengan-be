import { Router } from 'express';
import aiController from '../controllers/aiController';

const router = Router();

// Public route untuk chatbot AI Bedengan Xplore
// Menangani POST /api/chat dan alias POST /api/chat/chat
router.post('/', aiController.chat);
router.post('/chat', aiController.chat);

export default router;

