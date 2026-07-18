const express = require('express');
const profileController = require('../controllers/profileController');
const { tokenRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', tokenRequired, profileController.getProfile);

module.exports = router;
