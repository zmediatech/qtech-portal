const Mark = require("../models/Mark");

/* ----------------- Inline helpers ----------------- */
function gradeFromPercentage(pct) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

function toPercentage(obtained, total) {
  const t = Number(total);
  const o = Number(obtained);
  if (!t || t <= 0) return 0;
  const v = (o / t) * 100;
  return Math.round(v * 100) / 100; // 2 decimals
}

/* ----------------- Query helpers ----------------- */
function buildFilter(qs) {
  const filter = {};
  const { q, className, subject, from, to } = qs;

  if (q && q.trim()) {
    const s = q.trim();
    filter.$or = [
      { regNo: { $regex: s, $options: "i" } },
      { studentName: { $regex: s, $options: "i" } },
      { className: { $regex: s, $options: "i" } },
      { subject: { $regex: s, $options: "i" } },
    ];
  }

  if (className) filter.className = className;
  if (subject) filter.subject = subject;

  if (from || to) {
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    filter.$or = (filter.$or || []).concat([{ examDate: dateFilter }, { createdAt: dateFilter }]);
  }

  return filter;
}

function parseSort(sortStr) {
  if (!sortStr) return { createdAt: -1 };
  const parts = String(sortStr).split(",").map((s) => s.trim()).filter(Boolean);
  const sort = {};
  for (const p of parts) {
    const [field, dir] = p.split(":");
    if (!field) continue;
    sort[field] = dir && dir.toLowerCase() === "asc" ? 1 : -1;
  }
  return Object.keys(sort).length ? sort : { createdAt: -1 };
}

/* ----------------- Controllers ----------------- */
async function listMarks(req, res) {
  try {
    const { page = 1, limit = 50, sort = "createdAt:desc" } = req.query;

    const filter = buildFilter(req.query);
    const sortObj = parseSort(sort);

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 500);

    const [items, total] = await Promise.all([
      Mark.find(filter).sort(sortObj).skip((currentPage - 1) * perPage).limit(perPage).lean(),
      Mark.countDocuments(filter),
    ]);

    return res.json({
      items,
      total,
      page: currentPage,
      pages: Math.ceil(total / perPage),
    });
  } catch (err) {
    console.error("listMarks error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getMarkById(req, res) {
  try {
    const mark = await Mark.findById(req.params.id);
    if (!mark) return res.status(404).json({ success: false, error: "Record not found" });
    res.json({ success: true, data: mark });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function createMark(req, res) {
  try {
    const { regNo, studentName, className, subject, examTitle, examDate, totalMarks, obtainedMarks } = req.body;

    if (!regNo || !studentName || !className || !subject) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }
    if (!(totalMarks > 0)) {
      return res.status(400).json({ success: false, error: "totalMarks must be > 0" });
    }
    if (obtainedMarks < 0 || obtainedMarks > totalMarks) {
      return res.status(400).json({ success: false, error: "obtainedMarks must be between 0 and totalMarks" });
    }

    const percentage = toPercentage(obtainedMarks, totalMarks);
    const grade = gradeFromPercentage(percentage);

    const doc = new Mark({
      regNo,
      studentName,
      className,
      subject,
      examTitle: examTitle || "Exam",
      examDate: examDate ? new Date(examDate) : undefined,
      totalMarks,
      obtainedMarks,
      percentage,
      grade,
    });

    const saved = await doc.save();
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error("createMark error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
}

async function updateMark(req, res) {
  try {
    const { regNo, studentName, className, subject, examTitle, examDate, totalMarks, obtainedMarks } = req.body;

    const record = await Mark.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: "Record not found" });

    if (regNo !== undefined) record.regNo = regNo;
    if (studentName !== undefined) record.studentName = studentName;
    if (className !== undefined) record.className = className;
    if (subject !== undefined) record.subject = subject;
    if (examTitle !== undefined) record.examTitle = examTitle;
    if (examDate !== undefined) record.examDate = examDate ? new Date(examDate) : undefined;
    if (totalMarks !== undefined) record.totalMarks = totalMarks;
    if (obtainedMarks !== undefined) record.obtainedMarks = obtainedMarks;

    if (!(record.totalMarks > 0)) {
      return res.status(400).json({ success: false, error: "totalMarks must be > 0" });
    }
    if (record.obtainedMarks < 0 || record.obtainedMarks > record.totalMarks) {
      return res.status(400).json({ success: false, error: "obtainedMarks must be between 0 and totalMarks" });
    }

    record.percentage = toPercentage(record.obtainedMarks, record.totalMarks);
    record.grade = gradeFromPercentage(record.percentage);

    const updated = await record.save();
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updateMark error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
}

async function deleteMark(req, res) {
  try {
    const deleted = await Mark.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: "Record not found" });
    res.json({ success: true, message: "Record deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  listMarks,
  getMarkById,
  createMark,
  updateMark,
  deleteMark,
};
