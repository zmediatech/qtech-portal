// routes/studentRoutes.js
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentsByClass,
} = require('../controllers/studentController');

const router = express.Router();

router.post('/', requireAuth, requireRole('admin', 'teacher'), createStudent);        // Create
router.get('/', requireAuth, getAllStudents);        // Read all (supports ?q= & ?classId=)
// New route to get students by class
router.get('/class/:classId', requireAuth, getStudentsByClass);
router.get('/:id', requireAuth, getStudentById);     // Read one
router.patch('/:id', requireAuth, requireRole('admin', 'teacher'), updateStudent);    // Update
router.delete('/:id', requireAuth, requireRole('admin', 'teacher'), deleteStudent);   // Delete

module.exports = router;
