const express = require('express');
const multer = require('multer');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { auditAction } = require('../middleware/auditTrail');
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
router.post('/courses', requireAuth, requireRole('admin', 'teacher'), auditAction('course.create', (req) => ({
  title: req.body?.title,
  scopeType: req.body?.scopeType,
})), createCourse);
router.get('/courses/:id', requireAuth, getCourseById);
router.patch('/courses/:id', requireAuth, requireRole('admin', 'teacher'), auditAction('course.update', (req) => ({
  courseId: req.params.id,
  title: req.body?.title,
  scopeType: req.body?.scopeType,
})), updateCourse);
router.delete('/courses/:id', requireAuth, requireRole('admin', 'teacher'), auditAction('course.delete', (req) => ({
  courseId: req.params.id,
})), deleteCourse);
router.get('/courses/:courseId/lectures', requireAuth, listLectureByCourse);
router.post('/courses/:courseId/lectures', requireAuth, requireRole('admin', 'teacher'), auditAction('lecture.create', (req) => ({
  courseId: req.params.courseId,
  title: req.body?.title,
})), upload.single('file'), addLecture);
router.post('/courses/:courseId/enroll', requireAuth, auditAction('course.enroll', (req) => ({
  courseId: req.params.courseId,
})), enrollInCourse);
router.get('/enrollments/me', requireAuth, getMyEnrollments);

module.exports = router;
