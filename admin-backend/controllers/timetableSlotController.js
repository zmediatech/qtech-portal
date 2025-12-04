const TimetableSlot = require('../models/TimetableSlot');
const mongoose = require('mongoose');

const TIME_24H_RE = /^\d{2}:\d{2}$/;

function isValidTime(t) {
  return TIME_24H_RE.test(t);
}
function toMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function validateTimes(startTime, endTime) {
  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    return 'startTime and endTime must be in HH:MM (24h) format';
  }
  if (toMinutes(endTime) <= toMinutes(startTime)) {
    return 'endTime must be after startTime';
  }
  return null;
}

/** Create */
async function createTimetableSlot(req, res) {
  try {
    const { day, startTime, endTime, location, class: classId, subject, instructorName } = req.body;

    // Required
    if (!day || !startTime || !endTime || !classId || !subject) {
      return res.status(400).json({ success: false, message: 'day, startTime, endTime, class, subject are required' });
    }

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: 'Invalid class ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(subject)) {
      return res.status(400).json({ success: false, message: 'Invalid subject ID format' });
    }

    // Validate times
    const timeErr = validateTimes(startTime, endTime);
    if (timeErr) {
      return res.status(400).json({ success: false, message: timeErr });
    }

    // Check for conflicts
    const existingSlots = await TimetableSlot.find({
      class: classId,
      day,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    });

    if (existingSlots.length > 0) {
      return res.status(409).json({ success: false, message: 'Time slot conflicts with existing slot for this class' });
    }

    // Create
    const doc = await TimetableSlot.create({
      day,
      startTime,
      endTime,
      location: location || {},
      class: new mongoose.Types.ObjectId(classId),
      subject: new mongoose.Types.ObjectId(subject),
      instructorName: instructorName || ""
    });

    // Populate
    const populatedDoc = await TimetableSlot.findById(doc._id)
      .populate('class', 'name description')
      .populate('subject', 'name code');

    return res.status(201).json({ success: true, message: 'Timetable slot created successfully', data: populatedDoc });
  } catch (err) {
    console.error('Create slot error:', err);
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: 'A slot for this class/day/startTime/subject already exists' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

/** Get all */
async function getAllTimetableSlots(req, res) {
  try {
    const { classId, day, subjectId } = req.query;
    const filter = {};

    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ success: false, message: 'Invalid class ID format' });
      }
      filter.class = new mongoose.Types.ObjectId(classId);
    }
    if (day) filter.day = day;
    if (subjectId) {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ success: false, message: 'Invalid subject ID format' });
      }
      filter.subject = new mongoose.Types.ObjectId(subjectId);
    }

    const list = await TimetableSlot.find(filter)
      .sort({ day: 1, startTime: 1 })
      .populate('class', 'name description')
      .populate('subject', 'name code');

    return res.status(200).json({ success: true, count: list.length, data: list });
  } catch (err) {
    console.error('Get all slots error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

/** Get one */
async function getTimetableSlotById(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Slot ID is required' });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid slot ID format' });

    const doc = await TimetableSlot.findById(id)
      .populate('class', 'name description')
      .populate('subject', 'name code');

    if (!doc) return res.status(404).json({ success: false, message: 'Timetable slot not found' });

    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    console.error('Get slot by ID error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

/** Update */
async function updateTimetableSlot(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Slot ID is required' });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid slot ID format' });

    const payload = { ...req.body };

    // Validate IDs
    if (payload.class && !mongoose.Types.ObjectId.isValid(payload.class)) {
      return res.status(400).json({ success: false, message: 'Invalid class ID format' });
    }
    if (payload.subject && !mongoose.Types.ObjectId.isValid(payload.subject)) {
      return res.status(400).json({ success: false, message: 'Invalid subject ID format' });
    }

    if (payload.class) payload.class = new mongoose.Types.ObjectId(payload.class);
    if (payload.subject) payload.subject = new mongoose.Types.ObjectId(payload.subject);

    // Validate times
    if (payload.startTime || payload.endTime) {
      const existing = await TimetableSlot.findById(id).lean();
      if (!existing) return res.status(404).json({ success: false, message: 'Timetable slot not found' });

      const startTime = payload.startTime || existing.startTime;
      const endTime = payload.endTime || existing.endTime;

      const timeErr = validateTimes(startTime, endTime);
      if (timeErr) return res.status(400).json({ success: false, message: timeErr });

      const classId = payload.class || existing.class;
      const day = payload.day || existing.day;

      const conflicts = await TimetableSlot.find({
        _id: { $ne: id },
        class: classId,
        day,
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      });

      if (conflicts.length > 0) {
        return res.status(409).json({ success: false, message: 'Time slot conflicts with existing slot for this class' });
      }
    }

    const updated = await TimetableSlot.findByIdAndUpdate(id, payload, { new: true, runValidators: true })
      .populate('class', 'name description')
      .populate('subject', 'name code');

    if (!updated) return res.status(404).json({ success: false, message: 'Timetable slot not found' });

    return res.status(200).json({ success: true, message: 'Timetable slot updated successfully', data: updated });
  } catch (err) {
    console.error('Update slot error:', err);
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: 'A slot for this class/day/startTime/subject already exists' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

/** Delete */
async function deleteTimetableSlot(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Slot ID is required' });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid slot ID format' });

    const deleted = await TimetableSlot.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Timetable slot not found' });

    return res.status(200).json({ success: true, message: 'Timetable slot deleted successfully', data: deleted });
  } catch (err) {
    console.error('Delete slot error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

module.exports = {
  createTimetableSlot,
  getAllTimetableSlots,
  getTimetableSlotById,
  updateTimetableSlot,
  deleteTimetableSlot,
};
