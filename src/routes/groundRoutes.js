const express = require('express');
const router = express.Router();
const groundController = require('../controllers/groundController');
const authMiddleware = require('../middlewares/authMiddleware');
const { handleUpload } = require('../middlewares/uploadMiddleware');

// Public routes
router.get('/', groundController.getAllGrounds);
router.get('/:code', groundController.getGroundDetail);

// Protected routes (Admin only)
router.post('/', authMiddleware, handleUpload('image'), groundController.createGround);
router.put('/:id', authMiddleware, handleUpload('image'), groundController.updateGround);
router.delete('/:id', authMiddleware, groundController.deleteGround);

module.exports = router;
