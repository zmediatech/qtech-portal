// routes/classRoutes.js
const express = require('express');
const {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
} = require('../controllers/classController');

const router = express.Router();

router.post('/', createClass);       // Create
router.get('/', getAllClasses);      // Read all
router.get('/:id', getClassById);    // Read one
router.patch('/:id', updateClass);   // Update
router.delete('/:id', deleteClass);  // Delete

module.exports = router;
