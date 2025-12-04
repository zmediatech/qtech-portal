// controllers/examController.js
const mongoose = require('mongoose');
const Exam = require('../models/Exam'); // matches your filename

// Parse "dd/mm/yyyy hh:mm" -> Date
function parseDDMMYYYYTime(s) {
  if (s instanceof Date) return s;
  if (typeof s !== 'string') return s;
  const [datePart, timePart = '00:00'] = s.trim().split(/\s+/);
  if (!datePart) return s;
  const [d, m, y] = datePart.split('/').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  if (!y || !m || !d) return s;
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
}

// ---------- Create ----------
exports.createExam = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.startAt && typeof payload.startAt === 'string') {
      payload.startAt = parseDDMMYYYYTime(payload.startAt);
    }
    const exam = new Exam(payload);
    await exam.save();
    res.status(201).json({ ok: true, data: exam });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
};

// ---------- List (filters + pagination + sorting) ----------
exports.listExams = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      q,
      classId,
      subjectId,
      status,
      from,
      to,
      sort = 'startAt:asc',
    } = req.query;

    page = Math.max(parseInt(page) || 1, 1);
    limit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const filter = {};
    if (q) filter.title = { $regex: q, $options: 'i' };
    if (classId && mongoose.isValidObjectId(classId)) filter.classId = classId;
    if (subjectId && mongoose.isValidObjectId(subjectId)) filter.subjectId = subjectId;
    if (status) filter.status = status;

    if (from || to) {
      const gte = from ? (isNaN(new Date(from)) ? parseDDMMYYYYTime(from) : new Date(from)) : null;
      const lte = to ? (isNaN(new Date(to)) ? parseDDMMYYYYTime(to) : new Date(to)) : null;
      filter.startAt = {};
      if (gte) filter.startAt.$gte = gte;
      if (lte) filter.startAt.$lte = lte;
    }

    const sortObj = {};
    String(sort)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(part => {
        const [k, d = 'asc'] = part.split(':');
        sortObj[k] = d.toLowerCase() === 'desc' ? -1 : 1;
      });

    const [items, total] = await Promise.all([
      Exam.find(filter).sort(sortObj).skip((page - 1) * limit).limit(limit),
      Exam.countDocuments(filter),
    ]);

    res.json({
      ok: true,
      data: items,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
};

// ---------- Get by ID ----------
exports.getExam = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid exam id' });
    }
    const exam = await Exam.findById(id);
    if (!exam) return res.status(404).json({ ok: false, error: 'Exam not found' });
    res.json({ ok: true, data: exam });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
};

// ---------- Update ----------
exports.updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };
    if (payload.startAt && typeof payload.startAt === 'string') {
      payload.startAt = parseDDMMYYYYTime(payload.startAt);
    }

    const updated = await Exam.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ ok: false, error: 'Exam not found' });
    res.json({ ok: true, data: updated });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
};

// ---------- Delete ----------
exports.deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Exam.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ ok: false, error: 'Exam not found' });
    res.json({ ok: true, data: { _id: deleted._id } });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
};

// ---------- Add Question ----------
exports.addQuestion = async (req, res) => {
  try {
    const { id } = req.params; // exam id
    // Expect: { text, options: [String], correctOptionIndex, marks, explanation }
    const question = req.body;

    // Quick shape guard to avoid "options as string"
    if (!Array.isArray(question.options)) {
      return res.status(400).json({ ok: false, error: 'options must be an array of strings' });
    }

    const exam = await Exam.findById(id);
    if (!exam) return res.status(404).json({ ok: false, error: 'Exam not found' });

    exam.questions.push(question);
    await exam.save(); // triggers validation
    res.status(201).json({ ok: true, data: exam });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
};

// ---------- Update Question ----------
exports.updateQuestion = async (req, res) => {
  try {
    const { id, qindex } = req.params; // using index for your _id:false subdocs
    const idx = parseInt(qindex, 10);
    if (Number.isNaN(idx) || idx < 0) {
      return res.status(400).json({ ok: false, error: 'Invalid question index' });
    }

    const exam = await Exam.findById(id);
    if (!exam) return res.status(404).json({ ok: false, error: 'Exam not found' });
    if (!exam.questions[idx]) return res.status(404).json({ ok: false, error: 'Question not found' });

    const updates = req.body;
    // if client accidentally sends string for options, reject
    if (updates.options && !Array.isArray(updates.options)) {
      return res.status(400).json({ ok: false, error: 'options must be an array of strings' });
    }

    Object.assign(exam.questions[idx], updates);
    await exam.save();
    res.json({ ok: true, data: exam });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
};

// ---------- Remove Question ----------
exports.removeQuestion = async (req, res) => {
  try {
    const { id, qindex } = req.params;
    const idx = parseInt(qindex, 10);
    if (Number.isNaN(idx) || idx < 0) {
      return res.status(400).json({ ok: false, error: 'Invalid question index' });
    }

    const exam = await Exam.findById(id);
    if (!exam) return res.status(404).json({ ok: false, error: 'Exam not found' });
    if (!exam.questions[idx]) return res.status(404).json({ ok: false, error: 'Question not found' });

    exam.questions.splice(idx, 1);
    await exam.save();
    res.json({ ok: true, data: exam });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
};
