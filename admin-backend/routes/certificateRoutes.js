// routes/certificateRoutes.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  makeCertificate,
  getAllCertificates,
  getCertificateById,
  getCertificatePdf,
  verifyCertificate,
} = require('../controllers/certificateController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// POST /api/certificates/make
// form-data: image(file), name(text), xPercent?, yPercent?, fontSize?, marginPt?, r?, g?, b?
router.post('/make', upload.single('image'), makeCertificate);
router.get('/records', getAllCertificates);
router.get('/records/:certificateId/pdf', getCertificatePdf);
router.get('/records/:certificateId', getCertificateById);
router.get('/verify/:certificateId', verifyCertificate);

module.exports = router;
