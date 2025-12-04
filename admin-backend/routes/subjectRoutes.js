// routes/subjectRoutes.js
const express = require('express');
const {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
} = require('../controllers/subjectController');

const router = express.Router();

// Read all subjects - GET /api/subjects
router.get('/', getAllSubjects);

// Read single subject - GET /api/subjects/:id
router.get('/:id', getSubjectById);

// Create - POST /api/subjects
router.post('/', createSubject);

// Update - PATCH /api/subjects/:id
router.patch('/:id', updateSubject);

// Delete - DELETE /api/subjects/:id
router.delete('/:id', deleteSubject);

module.exports = router;