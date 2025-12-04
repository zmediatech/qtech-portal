const express = require('express');
const {
  createAttendance,
  updateAttendance,
  getAttendances,
  exportAttendance
} = require('../controllers/attendanceController');

const router = express.Router();

// POST to create attendance
router.post('/', createAttendance);

// PUT to update attendance
router.put('/', updateAttendance);

// GET to fetch attendance records (with filters for class and date)
router.get('/', getAttendances);

// Export attendance as CSV
router.get('/export', exportAttendance);

module.exports = router;
//skfhakdfh