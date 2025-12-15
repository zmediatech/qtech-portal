// controllers/subjectController.js
const Subject = require('../models/Subject');

// Read All (R)
async function getAllSubjects(req, res) {
  try {
    const subjects = await Subject.find()
      .populate('linkedClasses')
      .sort({ name: 1 });

    return res.status(200).json(subjects); // Return array directly to match frontend expectation
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

// Read One (R)
async function getSubjectById(req, res) {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('linkedClasses');

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    return res.status(200).json({ success: true, data: subject });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid subject ID' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

// Create (C)
async function createSubject(req, res) {
  try {
    const { name, code, linkedClasses } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'name and code are required' });
    }

    const subject = await Subject.create({
      name: String(name).trim(),
      code: String(code).trim().toUpperCase(),
      linkedClasses: Array.isArray(linkedClasses) ? linkedClasses : [],
    });

    return res.status(201).json({ success: true, message: 'Subject created', data: subject });
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.code) {
      return res.status(409).json({ success: false, message: 'Subject code must be unique' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

// Update (U)
async function updateSubject(req, res) {
  try {
    const { name, code, linkedClasses } = req.body;

    const payload = {};
    if (typeof name === 'string') payload.name = name.trim();
    if (typeof code === 'string') payload.code = code.trim().toUpperCase();
    if (Array.isArray(linkedClasses)) payload.linkedClasses = linkedClasses;

    const updated = await Subject.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    return res.status(200).json({ success: true, message: 'Subject updated', data: updated });
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.code) {
      return res.status(409).json({ success: false, message: 'Subject code must be unique' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

// Delete (D)
async function deleteSubject(req, res) {
  try {
    const deleted = await Subject.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    return res.status(200).json({ success: true, message: 'Subject deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

module.exports = {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
};