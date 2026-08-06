const Student = require("../models/Student");
const User = require("../models/User");
const ClassModel = require("../models/Class");
const Subject = require("../models/Subject");
const Course = require("../models/Course");
const Lecture = require("../models/Lecture");
const Enrollment = require("../models/Enrollment");
const Attendance = require("../models/Attendance");
const Exam = require("../models/Exam");
const FeeRecord = require("../models/FeeRecord");
const Expense = require("../models/Expense");
const AuditLog = require("../models/AuditLog");

function monthLabels(months = 6) {
  const fmt = new Intl.DateTimeFormat("en", { month: "short" });
  const out = [];
  const base = new Date();
  base.setDate(15);
  for (let i = months - 1; i >= 0; i--) {
    const dt = new Date(base.getFullYear(), base.getMonth() - i, 15);
    out.push({
      key: `${dt.getFullYear()}-${dt.getMonth() + 1}`,
      label: fmt.format(dt),
      y: dt.getFullYear(),
      m: dt.getMonth() + 1,
    });
  }
  return out;
}

async function getSummary(_req, res) {
  try {
    const months = Math.max(1, Math.min(12, parseInt(_req.query.months, 10) || 6));
    const labels = monthLabels(months);
    const oldest = labels[0];
    const newest = labels[labels.length - 1];
    const from = new Date(oldest.y, oldest.m - 1, 1, 0, 0, 0, 0);
    const to = new Date(newest.y, newest.m, 0, 23, 59, 59, 999);

    const [
      students,
      teachers,
      parents,
      classes,
      subjects,
      courses,
      lectures,
      enrollments,
      exams,
      feeRecords,
      expenses,
      attendanceRecords,
      auditLogs,
      activePaid,
      activeUnpaid,
      inactive,
      feesAgg,
      expensesAgg,
      recentCourses,
      recentLogs,
    ] = await Promise.all([
      Student.countDocuments(),
      User.countDocuments({ role: "teacher" }),
      User.countDocuments({ role: "parent" }),
      ClassModel.countDocuments(),
      Subject.countDocuments(),
      Course.countDocuments(),
      Lecture.countDocuments(),
      Enrollment.countDocuments(),
      Exam.countDocuments(),
      FeeRecord.countDocuments(),
      Expense.countDocuments(),
      Attendance.countDocuments(),
      AuditLog.countDocuments(),
      Student.countDocuments({ status: "Active", feeStatus: "Paid" }),
      Student.countDocuments({ status: "Active", feeStatus: { $ne: "Paid" } }),
      Student.countDocuments({ status: "Inactive" }),
      FeeRecord.aggregate([
        { $match: { date: { $gte: from, $lte: to }, status: "Paid" } },
        { $group: { _id: { y: { $year: "$date" }, m: { $month: "$date" } }, total: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: from, $lte: to } } },
        { $group: { _id: { y: { $year: "$date" }, m: { $month: "$date" } }, total: { $sum: "$amount" } } },
      ]),
      Course.find().sort({ createdAt: -1 }).limit(5).populate("teacher", "name email role").populate("classIds", "name").populate("subjectIds", "name code").lean(),
      AuditLog.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const feeMap = Object.fromEntries(feesAgg.map((item) => [`${item._id.y}-${item._id.m}`, Math.round(item.total || 0)]));
    const expenseMap = Object.fromEntries(expensesAgg.map((item) => [`${item._id.y}-${item._id.m}`, Math.round(item.total || 0)]));
    const incomeExpense = labels.map(({ key, label }) => ({
      month: label,
      income: feeMap[key] || 0,
      expenses: expenseMap[key] || 0,
    }));

    const totalRecords = Math.max(attendanceRecords, 1);
    const attendanceTotalPossible = await Attendance.aggregate([
      { $group: { _id: null, present: { $sum: { $size: { $ifNull: ["$presentStudents", []] } } }, absent: { $sum: { $size: { $ifNull: ["$absentStudents", []] } } }, late: { $sum: { $size: { $ifNull: ["$lateStudents", []] } } }, total: { $sum: "$totalStudents" } } },
    ]);
    const attendanceSummary = attendanceTotalPossible[0] || { present: 0, absent: 0, late: 0, total: 0 };
    const overallAttendance = attendanceSummary.total > 0 ? Math.round(((attendanceSummary.present + attendanceSummary.late) / attendanceSummary.total) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        counts: {
          students,
          teachers,
          parents,
          classes,
          subjects,
          courses,
          lectures,
          enrollments,
          exams,
          feeRecords,
          expenses,
          attendanceRecords,
          auditLogs,
        },
        studentBreakdown: [
          { name: "Active Paid", value: activePaid },
          { name: "Active Unpaid", value: activeUnpaid },
          { name: "Inactive", value: inactive },
        ],
        incomeExpense,
        recentCourses,
        recentLogs,
        attendance: {
          overallAttendance,
          present: attendanceSummary.present || 0,
          absent: attendanceSummary.absent || 0,
          late: attendanceSummary.late || 0,
          total: attendanceSummary.total || 0,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
}

module.exports = { getSummary };
