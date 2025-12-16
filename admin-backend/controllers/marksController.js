const Mark = require("../models/Mark");
const Student = require("../models/Student");
const Subject = require("../models/Subject");
const Exam = require("../models/Exam");

/* ---------- Helpers ---------- */
function gradeFromPercentage(p) {
  if (p >= 90) return "A+";
  if (p >= 80) return "A";
  if (p >= 70) return "B";
  if (p >= 60) return "C";
  if (p >= 50) return "D";
  return "F";
}

function calcPercentage(obtained, total) {
  return Math.round((obtained / total) * 10000) / 100;
}

/* ---------- List ---------- */
exports.listMarks = async (req, res) => {
  try {
    const { q, classId, subjectId, examId } = req.query;

    const filter = {};
    if (classId) filter.class = classId;
    if (subjectId) filter.subject = subjectId;
    if (examId) filter.exam = examId;

    const marks = await Mark.find(filter)
      .populate("student", "regNo name")
      .populate("class", "name")
      .populate("subject", "name")
      .populate("exam", "title")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: marks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ---------- Single ---------- */
exports.getMarkById = async (req, res) => {
  try {
    const mark = await Mark.findById(req.params.id)
      .populate("student")
      .populate("class")
      .populate("subject")
      .populate("exam");

    if (!mark)
      return res.status(404).json({ success: false, error: "Not found" });

    res.json({ success: true, data: mark });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ---------- Create ---------- */
exports.createMark = async (req, res) => {
  try {
    const { studentId, subjectId, examId, totalMarks, obtainedMarks } = req.body;

    if (!studentId || !subjectId || totalMarks == null || obtainedMarks == null)
      return res.status(400).json({ error: "Missing required fields" });

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    if (obtainedMarks > totalMarks)
      return res.status(400).json({ error: "Invalid marks" });

    const percentage = calcPercentage(obtainedMarks, totalMarks);
    const grade = gradeFromPercentage(percentage);

    const mark = await Mark.create({
      student: student._id,
      class: student.classId,
      subject: subjectId,
      exam: examId || null,
      totalMarks,
      obtainedMarks,
      percentage,
      grade,
    });

    res.status(201).json({ success: true, data: mark });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: "Marks already exist for this student and exam",
      });
    }
    res.status(400).json({ success: false, error: err.message });
  }
};

/* ---------- Update ---------- */
exports.updateMark = async (req, res) => {
  try {
    const { totalMarks, obtainedMarks } = req.body;

    const mark = await Mark.findById(req.params.id);
    if (!mark) return res.status(404).json({ error: "Not found" });

    if (obtainedMarks > totalMarks)
      return res.status(400).json({ error: "Invalid marks" });

    mark.totalMarks = totalMarks;
    mark.obtainedMarks = obtainedMarks;
    mark.percentage = calcPercentage(obtainedMarks, totalMarks);
    mark.grade = gradeFromPercentage(mark.percentage);

    await mark.save();
    res.json({ success: true, data: mark });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

/* ---------- Delete ---------- */
exports.deleteMark = async (req, res) => {
  try {
    await Mark.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
