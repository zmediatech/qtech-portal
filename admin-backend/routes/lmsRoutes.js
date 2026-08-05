const express = require('express');
const multer = require('multer');
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

const upload = multer({
  storage: multer.memoryStorage(),
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
