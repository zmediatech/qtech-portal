const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseById,
  addLecture,
  enrollInCourse,
  getMyEnrollments,
  listLectureByCourse,
} = require('../controllers/lmsController');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'lectures');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const safeBase = `${Date.now()}-${file.originalname}`.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, safeBase);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.get('/courses', requireAuth, listCourses);
router.post('/courses', requireAuth, requireRole('admin', 'teacher'), createCourse);
router.get('/courses/:id', requireAuth, getCourseById);
router.patch('/courses/:id', requireAuth, requireRole('admin', 'teacher'), updateCourse);
router.delete('/courses/:id', requireAuth, requireRole('admin', 'teacher'), deleteCourse);
router.get('/courses/:courseId/lectures', requireAuth, listLectureByCourse);
router.post('/courses/:courseId/lectures', requireAuth, requireRole('admin', 'teacher'), upload.single('file'), addLecture);
router.post('/courses/:courseId/enroll', requireAuth, enrollInCourse);
router.get('/enrollments/me', requireAuth, getMyEnrollments);

module.exports = router;
