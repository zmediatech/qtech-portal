// routes/studentRoutes.js
const express = require('express');
const {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentsByClass,
} = require('../controllers/studentController');

const router = express.Router();

router.post('/', createStudent);        // Create
router.get('/', getAllStudents);        // Read all (supports ?q= & ?classId=)
router.get('/:id', getStudentById);     // Read one
router.patch('/:id', updateStudent);    // Update
router.delete('/:id', deleteStudent);   // Delete
// New route to get students by class
router.get('/class/:classId', getStudentsByClass);

module.exports = router;
