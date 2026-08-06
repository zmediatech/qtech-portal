// routes/studentRoutes.js
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { auditAction } = require('../middleware/auditTrail');
const {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentsByClass,
} = require('../controllers/studentController');

const router = express.Router();

router.post('/', requireAuth, requireRole('admin', 'teacher'), auditAction('student.create', (req) => ({
  regNo: req.body?.regNo,
  name: req.body?.name,
  classId: req.body?.class,
})), createStudent);        // Create
router.get('/', requireAuth, getAllStudents);        // Read all (supports ?q= & ?classId=)
// New route to get students by class
router.get('/class/:classId', requireAuth, getStudentsByClass);
router.get('/:id', requireAuth, getStudentById);     // Read one
router.patch('/:id', requireAuth, requireRole('admin', 'teacher'), auditAction('student.update', (req) => ({
  studentId: req.params.id,
  regNo: req.body?.regNo,
  classId: req.body?.class,
})), updateStudent);    // Update
router.delete('/:id', requireAuth, requireRole('admin', 'teacher'), auditAction('student.delete', (req) => ({
  studentId: req.params.id,
})), deleteStudent);   // Delete

module.exports = router;
