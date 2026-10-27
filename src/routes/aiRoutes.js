const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Public route untuk chatbot AI Bedengan Xplore
// Menangani POST /api/chat dan alias POST /api/chat/chat
router.post('/', aiController.chat);
router.post('/chat', aiController.chat);

module.exports = router;
