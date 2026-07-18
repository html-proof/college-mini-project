const express = require('express');
const profileController = require('../controllers/profileController');
const { tokenRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/track', tokenRequired, profileController.trackStudyTime);

module.exports = router;
