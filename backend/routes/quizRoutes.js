const express = require('express');
const quizController = require('../controllers/quizController');
const { tokenRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/generate', tokenRequired, quizController.generateQuiz);
router.post('/submit', tokenRequired, quizController.submitQuiz);

module.exports = router;
