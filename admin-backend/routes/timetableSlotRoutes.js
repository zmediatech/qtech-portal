// routes/timetableSlotRoutes.js
const express = require('express');
const {
  createTimetableSlot,
  getAllTimetableSlots,
  getTimetableSlotById,
  updateTimetableSlot,
  deleteTimetableSlot,
} = require('../controllers/timetableSlotController');

const router = express.Router();

// Create a new timetable slot
router.post('/', createTimetableSlot);

// Get all timetable slots with optional filters
// Query params: ?classId=xxx&day=Monday&subjectId=xxx&instructorId=xxx
router.get('/', getAllTimetableSlots);

// Get a single timetable slot by ID
router.get('/:id', getTimetableSlotById);

// Update a timetable slot by ID
router.patch('/:id', updateTimetableSlot);
router.put('/:id', updateTimetableSlot); // Allow both PATCH and PUT

// Delete a timetable slot by ID
router.delete('/:id', deleteTimetableSlot);

module.exports = router;