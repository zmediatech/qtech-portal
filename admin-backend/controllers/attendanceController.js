const Attendance = require('../models/Attendance');
const json2csv = require('json2csv').parse;

// Helper function to normalize the date to UTC midnight
function normalizeToUtcMidnight(d) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

// Helper function to validate attendance buckets (present, absent, late)
function validateBuckets({ presentStudents = [], absentStudents = [], lateStudents = [], totalStudents }) {
  const toIds = (arr) => (arr || []).map(String);
  const all = [...toIds(presentStudents), ...toIds(absentStudents), ...toIds(lateStudents)];
  const unique = new Set(all);
  if (unique.size !== all.length) return 'A student cannot appear in multiple attendance categories.';
  if (typeof totalStudents === 'number' && totalStudents < unique.size) {
    return 'totalStudents cannot be less than the number of marked students.';
  }
  return null;
}

// Create Attendance Record
async function createAttendance(req, res) {
  try {
    let { date, class: classId, totalStudents, presentStudents, absentStudents, lateStudents, notes } = req.body;

    if (!date || !classId || typeof totalStudents !== 'number') {
      return res.status(400).json({ success: false, message: 'date, class, and totalStudents are required' });
    }

    const normalizedDate = normalizeToUtcMidnight(date);
    if (!normalizedDate) return res.status(400).json({ success: false, message: 'Invalid date' });

    const bucketError = validateBuckets({ presentStudents, absentStudents, lateStudents, totalStudents });
    if (bucketError) return res.status(400).json({ success: false, message: bucketError });

    const doc = await Attendance.create({
      date: normalizedDate,
      class: classId,
      totalStudents,
      presentStudents: presentStudents || [],
      absentStudents: absentStudents || [],
      lateStudents: lateStudents || [],
      notes,
    });

    return res.status(201).json({ success: true, message: 'Attendance created', data: doc });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Attendance already exists for this class/date',
      });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

// Update Attendance Record
async function updateAttendance(req, res) {
  try {
    let { date, class: classId, totalStudents, presentStudents, absentStudents, lateStudents, notes } = req.body;

    if (!date || !classId || typeof totalStudents !== 'number') {
      return res.status(400).json({ success: false, message: 'date, class, and totalStudents are required' });
    }

    const normalizedDate = normalizeToUtcMidnight(date);
    if (!normalizedDate) return res.status(400).json({ success: false, message: 'Invalid date' });

    const bucketError = validateBuckets({ presentStudents, absentStudents, lateStudents, totalStudents });
    if (bucketError) return res.status(400).json({ success: false, message: bucketError });

    // Find and update existing attendance record
    const doc = await Attendance.findOneAndUpdate(
      { date: normalizedDate, class: classId },
      {
        totalStudents,
        presentStudents: presentStudents || [],
        absentStudents: absentStudents || [],
        lateStudents: lateStudents || [],
        notes,
      },
      { new: true, runValidators: true }
    );

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    return res.status(200).json({ success: true, message: 'Attendance updated', data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

// Get All Attendances (with class and date filters)
async function getAttendances(req, res) {
  try {
    const { classId, date } = req.query;
    const filter = {};
    if (classId) filter.class = classId;
    if (date) {
      const d = normalizeToUtcMidnight(date);
      if (!d) return res.status(400).json({ success: false, message: 'Invalid date' });
      filter.date = d;
    }

    const list = await Attendance.find(filter)
      .populate('class', 'name')
      .populate('presentStudents absentStudents lateStudents', 'name regNo')
      .sort({ date: -1 });

    return res.status(200).json({ success: true, count: list.length, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

// Export Attendance Data as CSV
async function exportAttendance(req, res) {
  const { classId, date } = req.query;
  const filter = {};
  if (classId) filter.class = classId;
  if (date) {
    const d = normalizeToUtcMidnight(date);
    if (!d) return res.status(400).json({ success: false, message: 'Invalid date' });
    filter.date = d;
  }

  try {
    const list = await Attendance.find(filter)
      .populate('class', 'name')
      .populate('presentStudents absentStudents lateStudents', 'name regNo')
      .sort({ date: -1 });

    if (list.length === 0) {
      return res.status(404).json({ success: false, message: 'No attendance records found' });
    }

    // Flatten the data for CSV export
    const csvData = list.flatMap(record => {
      const rows = [];
      
      // Add present students
      record.presentStudents.forEach(student => {
        rows.push({
          Date: record.date.toISOString().split('T')[0],
          Class: record.class?.name || 'N/A',
          StudentName: student.name,
          RegNo: student.regNo,
          Status: 'Present',
          Notes: record.notes || ''
        });
      });

      // Add absent students
      record.absentStudents.forEach(student => {
        rows.push({
          Date: record.date.toISOString().split('T')[0],
          Class: record.class?.name || 'N/A',
          StudentName: student.name,
          RegNo: student.regNo,
          Status: 'Absent',
          Notes: record.notes || ''
        });
      });

      // Add late students
      record.lateStudents.forEach(student => {
        rows.push({
          Date: record.date.toISOString().split('T')[0],
          Class: record.class?.name || 'N/A',
          StudentName: student.name,
          RegNo: student.regNo,
          Status: 'Late',
          Notes: record.notes || ''
        });
      });

      return rows;
    });

    const csv = json2csv(csvData);
    res.header('Content-Type', 'text/csv');
    res.attachment('attendance-report.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate report', error: err.message });
  }
}

module.exports = {
  createAttendance,
  updateAttendance,
  getAttendances,
  exportAttendance,
};