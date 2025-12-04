// routes/certificateRoutes.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const { makeCertificate } = require('../controllers/certificateController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// POST /api/certificates/make
// form-data: image(file), name(text), xPercent?, yPercent?, fontSize?, marginPt?, r?, g?, b?
router.post('/make', upload.single('image'), makeCertificate);

module.exports = router;
