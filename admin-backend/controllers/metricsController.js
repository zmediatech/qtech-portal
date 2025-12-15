// controllers/metricsController.js
const Student = require("../models/Student");
const FeeRecord = require("../models/FeeRecord");
const Expense = require("../models/Expense");

// Month labels like ["Apr","May","Jun","Jul","Aug","Sep"]
function lastNMonthLabels(n = 6) {
  const fmt = new Intl.DateTimeFormat("en", { month: "short" });
  const out = [];
  const d = new Date();
  d.setDate(15);
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 15);
    out.push({ key: `${dt.getFullYear()}-${dt.getMonth() + 1}`, label: fmt.format(dt), y: dt.getFullYear(), m: dt.getMonth() + 1 });
  }
  return out;
}

// GET /api/metrics/income-expense?months=6
// -> [{ month: "Jan", income: 45000, expenses: 32000 }, ...]
exports.getIncomeExpense = async (req, res) => {
  try {
    const months = Math.max(1, Math.min(12, parseInt(req.query.months, 10) || 6));
    const labels = lastNMonthLabels(months);

    const oldest = labels[0];
    const newest = labels[labels.length - 1];
    const from = new Date(oldest.y, oldest.m - 1, 1, 0, 0, 0, 0);
    const to = new Date(newest.y, newest.m, 0, 23, 59, 59, 999);

    const [feesAgg, expAgg] = await Promise.all([
      FeeRecord.aggregate([
        { $match: { date: { $gte: from, $lte: to }, status: "Paid" } },
        { $group: { _id: { y: { $year: "$date" }, m: { $month: "$date" } }, total: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: from, $lte: to } } },
        { $group: { _id: { y: { $year: "$date" }, m: { $month: "$date" } }, total: { $sum: "$amount" } } },
      ]),
    ]);

    const feesMap = Object.fromEntries(feesAgg.map(r => [`${r._id.y}-${r._id.m}`, Math.round(r.total || 0)]));
    const expMap  = Object.fromEntries(expAgg.map(r  => [`${r._id.y}-${r._id.m}`, Math.round(r.total || 0)]));

    const data = labels.map(({ key, label }) => ({
      month: label,
      income: feesMap[key] || 0,
      expenses: expMap[key] || 0,
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// GET /api/metrics/student-categories
// -> [{ name:"Active Paid", value:850 }, { name:"Active Unpaid", value:330 }, { name:"Inactive", value:54 }]
exports.getStudentCategories = async (_req, res) => {
  try {
    const [activePaid, activeUnpaid, inactive] = await Promise.all([
      Student.countDocuments({ status: "Active", feeStatus: "Paid" }),
      Student.countDocuments({ status: "Active", feeStatus: { $ne: "Paid" } }),
      Student.countDocuments({ status: "Inactive" }),
    ]);

    res.json([
      { name: "Active Paid", value: activePaid },
      { name: "Active Unpaid", value: activeUnpaid },
      { name: "Inactive", value: inactive },
    ]);
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
