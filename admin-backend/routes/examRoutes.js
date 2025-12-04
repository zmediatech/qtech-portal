// routes/examRoutes.js
const express = require('express');
const router = express.Router();
const examCtrl = require('../controllers/examController');

// Exam CRUD
router.post('/', examCtrl.createExam);
router.get('/', examCtrl.listExams);
router.get('/:id', examCtrl.getExam);
router.patch('/:id', examCtrl.updateExam);
router.delete('/:id', examCtrl.deleteExam);

// Question CRUD (index-based because _id:false in sub-schema)
router.post('/:id/questions', examCtrl.addQuestion);
router.patch('/:id/questions/:qindex', examCtrl.updateQuestion);
router.delete('/:id/questions/:qindex', examCtrl.removeQuestion);

module.exports = router;
