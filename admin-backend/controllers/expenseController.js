const Expense = require('../models/Expense');
const { Parser } = require('json2csv');

// Create a new expense
exports.createExpense = async (req, res) => {
  try {
    const { category, amount, date, description } = req.body;
    const expense = new Expense({ category, amount, date, description });
    const saved = await expense.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get expenses with filters
exports.getExpenses = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (category) filter.category = category;
    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single expense
exports.getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update expense
exports.updateExpense = async (req, res) => {
  try {
    const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updated) return res.status(404).json({ error: 'Expense not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete expense
exports.deleteExpense = async (req, res) => {
  try {
    const deleted = await Expense.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Expense not found' });
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Export CSV
exports.exportExpenses = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (category) filter.category = category;

    const expenses = await Expense.find(filter).lean();
    const parser = new Parser({ fields: ['category', 'amount', 'date', 'description'] });
    const csv = parser.parse(expenses);

    res.header('Content-Type', 'text/csv');
    res.attachment('expenses.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Summary dashboard
exports.getSummary = async (req, res) => {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [thisMonth] = await Expense.aggregate([
      { $match: { date: { $gte: thisMonthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const [lastMonth] = await Expense.aggregate([
      { $match: { date: { $gte: lastMonthStart, $lt: thisMonthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const [ytd] = await Expense.aggregate([
      { $match: { date: { $gte: yearStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const avgMonthly = ytd ? ytd.total / (now.getMonth() + 1) : 0;

    res.json({
      thisMonth: thisMonth?.total || 0,
      lastMonth: lastMonth?.total || 0,
      averageMonthly: avgMonthly,
      ytdTotal: ytd?.total || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
