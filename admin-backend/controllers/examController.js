// controllers/examController.js
const mongoose = require('mongoose');
const Exam = require('../models/Exam'); // matches your filename
const UserModel = require('../models/User');
const StudentModel = require('../models/Student');

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

function toIdString(value) {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') return String(value._id || value.id || '');
  return '';
}

async function getCurrentUser(req) {
  if (!req.user?.id) return null;
  return await UserModel.findById(req.user.id)
    .select('name email role studentClass parentStudentIds assignedClasses assignedSubjects')
    .lean();
}

async function buildExamScopeFilter(user) {
  const role = user?.role;
  if (!role || role === 'superadmin' || role === 'admin') return {};

  if (role === 'teacher') {
    const classIds = Array.isArray(user.assignedClasses) ? user.assignedClasses.map(toIdString).filter(Boolean) : [];
    const subjectIds = Array.isArray(user.assignedSubjects) ? user.assignedSubjects.map(toIdString).filter(Boolean) : [];
    const clauses = [];
    if (classIds.length) clauses.push({ classId: { $in: classIds } });
    if (subjectIds.length) clauses.push({ subjectId: { $in: subjectIds } });
    return clauses.length ? { $or: clauses } : { _id: null };
  }

  if (role === 'student') {
    const classId = toIdString(user.studentClass);
    return classId ? { classId } : { _id: null };
  }

  if (role === 'parent') {
    const studentIds = Array.isArray(user.parentStudentIds) ? user.parentStudentIds.map(toIdString).filter(Boolean) : [];
    if (!studentIds.length) return { _id: null };
    const students = await StudentModel.find({ _id: { $in: studentIds } }).select('class').lean();
    const classIds = [...new Set(students.map((student) => toIdString(student.class)).filter(Boolean))];
    user._visibleClassIds = classIds;
    return classIds.length ? { classId: { $in: classIds } } : { _id: null };
  }

  return { _id: null };
}

async function getParentClassIds(user) {
  const studentIds = Array.isArray(user?.parentStudentIds) ? user.parentStudentIds.map(toIdString).filter(Boolean) : [];
  if (!studentIds.length) return [];
  const students = await StudentModel.find({ _id: { $in: studentIds } }).select('class').lean();
  return [...new Set(students.map((student) => toIdString(student.class)).filter(Boolean))];
}

function canAccessExam(user, exam) {
  const role = user?.role;
  if (!role || role === 'superadmin' || role === 'admin') return true;

  const examClassId = toIdString(exam.classId);
  const examSubjectId = toIdString(exam.subjectId);

  if (role === 'teacher') {
    const classIds = Array.isArray(user.assignedClasses) ? user.assignedClasses.map(toIdString).filter(Boolean) : [];
    const subjectIds = Array.isArray(user.assignedSubjects) ? user.assignedSubjects.map(toIdString).filter(Boolean) : [];
    return classIds.includes(examClassId) || subjectIds.includes(examSubjectId);
  }

  if (role === 'student') {
    return toIdString(user.studentClass) === examClassId;
  }

  if (role === 'parent') {
    return Array.isArray(user._visibleClassIds) ? user._visibleClassIds.includes(examClassId) : false;
  }

  return false;
}

function teacherCanManageSelection(user, classId, subjectId) {
  if (!user || user.role !== 'teacher') return true;

  const assignedClassIds = Array.isArray(user.assignedClasses) ? user.assignedClasses.map(toIdString).filter(Boolean) : [];
  const assignedSubjectIds = Array.isArray(user.assignedSubjects) ? user.assignedSubjects.map(toIdString).filter(Boolean) : [];

  if (assignedClassIds.length && !assignedClassIds.includes(toIdString(classId))) {
    return false;
  }
  if (assignedSubjectIds.length && !assignedSubjectIds.includes(toIdString(subjectId))) {
    return false;
  }
  return true;
}

// ---------- Create ----------
exports.createExam = async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const payload = { ...req.body, createdBy: currentUser._id };
    if (payload.startAt && typeof payload.startAt === 'string') {
      payload.startAt = parseDDMMYYYYTime(payload.startAt);
    }
    if (!teacherCanManageSelection(currentUser, payload.classId, payload.subjectId)) {
      return res.status(403).json({ ok: false, error: 'You can only create exams for your assigned classes and subjects' });
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
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

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

    const visibilityFilter = await buildExamScopeFilter(currentUser);
    const filter = { ...visibilityFilter };
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
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid exam id' });
    }
    const exam = await Exam.findById(id);
    if (!exam) return res.status(404).json({ ok: false, error: 'Exam not found' });
    if (currentUser.role === 'parent') {
      currentUser._visibleClassIds = await getParentClassIds(currentUser);
    }
    if (!canAccessExam(currentUser, exam)) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }
    res.json({ ok: true, data: exam });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
};

// ---------- Update ----------
exports.updateExam = async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const payload = { ...req.body };
    if (payload.startAt && typeof payload.startAt === 'string') {
      payload.startAt = parseDDMMYYYYTime(payload.startAt);
    }

    const existing = await Exam.findById(id);
    if (!existing) return res.status(404).json({ ok: false, error: 'Exam not found' });
    if (!canAccessExam(currentUser, existing)) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }
    if (!teacherCanManageSelection(currentUser, payload.classId || existing.classId, payload.subjectId || existing.subjectId)) {
      return res.status(403).json({ ok: false, error: 'You can only update exams for your assigned classes and subjects' });
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
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const existing = await Exam.findById(id);
    if (!existing) return res.status(404).json({ ok: false, error: 'Exam not found' });
    if (!canAccessExam(currentUser, existing)) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

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
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { id } = req.params; // exam id
    // Expect: { text, options: [String], correctOptionIndex, marks, explanation }
    const question = req.body;

    // Quick shape guard to avoid "options as string"
    if (!Array.isArray(question.options)) {
      return res.status(400).json({ ok: false, error: 'options must be an array of strings' });
    }

    const exam = await Exam.findById(id);
    if (!exam) return res.status(404).json({ ok: false, error: 'Exam not found' });
    if (!canAccessExam(currentUser, exam)) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

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
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { id, qindex } = req.params; // using index for your _id:false subdocs
    const idx = parseInt(qindex, 10);
    if (Number.isNaN(idx) || idx < 0) {
      return res.status(400).json({ ok: false, error: 'Invalid question index' });
    }

    const exam = await Exam.findById(id);
    if (!exam) return res.status(404).json({ ok: false, error: 'Exam not found' });
    if (!canAccessExam(currentUser, exam)) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }
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
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { id, qindex } = req.params;
    const idx = parseInt(qindex, 10);
    if (Number.isNaN(idx) || idx < 0) {
      return res.status(400).json({ ok: false, error: 'Invalid question index' });
    }

    const exam = await Exam.findById(id);
    if (!exam) return res.status(404).json({ ok: false, error: 'Exam not found' });
    if (!canAccessExam(currentUser, exam)) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }
    if (!exam.questions[idx]) return res.status(404).json({ ok: false, error: 'Question not found' });

    exam.questions.splice(idx, 1);
    await exam.save();
    res.json({ ok: true, data: exam });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
};
