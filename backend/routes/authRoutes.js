const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authController = require('../controllers/authController');

const router = express.Router();

// Multer Storage Configuration for Profile Pictures
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.post('/register', upload.single('profile_image'), authController.register);
router.post('/login', authController.login);

module.exports = router;
