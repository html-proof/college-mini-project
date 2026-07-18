const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const materialsController = require('../controllers/materialsController');
const { tokenRequired } = require('../middleware/auth');

const router = express.Router();

// Multer Storage Configuration for uploads
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

router.get('/recommend', tokenRequired, materialsController.recommendMaterials);
router.post('/upload', tokenRequired, upload.single('file'), materialsController.uploadMaterial);
router.get('/list', tokenRequired, materialsController.listMaterials);

module.exports = router;
