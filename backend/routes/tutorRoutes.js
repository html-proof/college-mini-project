const express = require('express');
const tutorController = require('../controllers/tutorController');
const { tokenRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/chat', tokenRequired, tutorController.sendChatMessage);
router.get('/history', tokenRequired, tutorController.getChatHistory);

module.exports = router;
