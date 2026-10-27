const express = require('express');
const router = express.Router();
const guideController = require('../controllers/guideController');
const authMiddleware = require('../middlewares/authMiddleware');

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

module.exports = router;
