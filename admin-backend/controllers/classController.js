// controllers/classController.js
const ClassModel = require('../models/Class');

// Create
async function createClass(req, res) {
  try {
    const { name, description, subjects, students, courses } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const doc = await ClassModel.create({
      name: String(name).trim(),
      description: description?.trim(),
      subjects: Array.isArray(subjects) ? subjects : [],
      students: Array.isArray(students) ? students : [],
      // Persist strings only
      courses: Array.isArray(courses) ? courses.map(String) : [],
    });

    return res.status(201).json({ success: true, message: 'Class created', data: doc });
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.name) {
      return res.status(409).json({ success: false, message: 'Class name must be unique' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

// helper to normalize response
function normalizeClass(c) {
  const subjects = Array.isArray(c.subjects) ? c.subjects : [];
  // Prefer virtual students; fallback to physical array if virtual empty
  const studentsFromVirtual = Array.isArray(c.studentsVirtual) ? c.studentsVirtual : [];
  const studentsPhysical    = Array.isArray(c.students) ? c.students : [];
  const students = studentsFromVirtual.length ? studentsFromVirtual : studentsPhysical;

  let courses = c.courses;
  if (!Array.isArray(courses)) courses = [];
  courses = courses.map((x) =>
    typeof x === 'string' ? x : (x && (x.name || x.title || JSON.stringify(x))) // safety if objects slipped in
  );

  return { ...c, subjects, students, courses };
}

// Read all
async function getAllClasses(_req, res) {
  try {
    const list = await ClassModel.find()
      .populate('subjects', 'name code')
      .populate('students', 'name regNo') // physical
      .populate({ path: 'studentsVirtual', select: 'name regNo' }) // virtual
      .lean({ virtuals: true });

    const data = (list || []).map(normalizeClass);
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

// Read by ID
async function getClassById(req, res) {
  try {
    const found = await ClassModel.findById(req.params.id)
      .populate('subjects', 'name code')
      .populate('students', 'name regNo')
      .populate({ path: 'studentsVirtual', select: 'name regNo' })
      .lean({ virtuals: true });

    if (!found) return res.status(404).json({ success: false, message: 'Class not found' });
    const data = normalizeClass(found);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

// Update
async function updateClass(req, res) {
  try {
    const { name, description, subjects, students, courses } = req.body;

    const payload = {};
    if (typeof name === 'string') payload.name = name.trim();
    if (typeof description === 'string') payload.description = description.trim();
    if (Array.isArray(subjects)) payload.subjects = subjects;
    if (Array.isArray(students)) payload.students = students;
    if (Array.isArray(courses)) payload.courses = courses.map(String);

    const updated = await ClassModel.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    })
      .populate('subjects', 'name code')
      .populate('students', 'name regNo')
      .populate({ path: 'studentsVirtual', select: 'name regNo' })
      .lean({ virtuals: true });

    if (!updated) return res.status(404).json({ success: false, message: 'Class not found' });
    const data = normalizeClass(updated);
    return res.status(200).json({ success: true, message: 'Class updated', data });
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.name) {
      return res.status(409).json({ success: false, message: 'Class name must be unique' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

// Delete
async function deleteClass(req, res) {
  try {
    const deleted = await ClassModel.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Class not found' });
    return res.status(200).json({ success: true, message: 'Class deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

module.exports = {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
};
