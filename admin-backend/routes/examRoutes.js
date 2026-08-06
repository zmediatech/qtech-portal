// routes/examRoutes.js
const express = require('express');
const router = express.Router();
const examCtrl = require('../controllers/examController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { auditAction } = require('../middleware/auditTrail');

// Exam CRUD
router.post('/', requireAuth, requireRole('admin', 'teacher'), auditAction('exam.create', (req) => ({
  title: req.body?.title,
  classId: req.body?.classId,
  subjectId: req.body?.subjectId,
})), examCtrl.createExam);
router.get('/', requireAuth, examCtrl.listExams);
router.get('/:id', requireAuth, examCtrl.getExam);
router.patch('/:id', requireAuth, requireRole('admin', 'teacher'), auditAction('exam.update', (req) => ({
  examId: req.params.id,
  title: req.body?.title,
  classId: req.body?.classId,
  subjectId: req.body?.subjectId,
})), examCtrl.updateExam);
router.delete('/:id', requireAuth, requireRole('admin', 'teacher'), auditAction('exam.delete', (req) => ({
  examId: req.params.id,
})), examCtrl.deleteExam);

// Question CRUD (index-based because _id:false in sub-schema)
router.post('/:id/questions', requireAuth, requireRole('admin', 'teacher'), auditAction('exam.question.create', (req) => ({
  examId: req.params.id,
  questionType: req.body?.type,
})), examCtrl.addQuestion);
router.patch('/:id/questions/:qindex', requireAuth, requireRole('admin', 'teacher'), auditAction('exam.question.update', (req) => ({
  examId: req.params.id,
  questionIndex: req.params.qindex,
})), examCtrl.updateQuestion);
router.delete('/:id/questions/:qindex', requireAuth, requireRole('admin', 'teacher'), auditAction('exam.question.delete', (req) => ({
  examId: req.params.id,
  questionIndex: req.params.qindex,
})), examCtrl.removeQuestion);

module.exports = router;
