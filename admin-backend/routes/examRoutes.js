// routes/examRoutes.js
const express = require('express');
const router = express.Router();
const examCtrl = require('../controllers/examController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

// Exam CRUD
router.post('/', requireAuth, requireRole('admin', 'teacher'), examCtrl.createExam);
router.get('/', requireAuth, examCtrl.listExams);
router.get('/:id', requireAuth, examCtrl.getExam);
router.patch('/:id', requireAuth, requireRole('admin', 'teacher'), examCtrl.updateExam);
router.delete('/:id', requireAuth, requireRole('admin', 'teacher'), examCtrl.deleteExam);

// Question CRUD (index-based because _id:false in sub-schema)
router.post('/:id/questions', requireAuth, requireRole('admin', 'teacher'), examCtrl.addQuestion);
router.patch('/:id/questions/:qindex', requireAuth, requireRole('admin', 'teacher'), examCtrl.updateQuestion);
router.delete('/:id/questions/:qindex', requireAuth, requireRole('admin', 'teacher'), examCtrl.removeQuestion);

module.exports = router;
