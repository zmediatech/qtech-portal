const express = require('express');
const router = express.Router();
const controller = require('../controllers/expenseController');

// Summary + Export
router.get('/summary', controller.getSummary);
router.get('/export', controller.exportExpenses);

// CRUD
router.post('/', controller.createExpense);
router.get('/', controller.getExpenses);
router.get('/:id', controller.getExpenseById);
router.put('/:id', controller.updateExpense);
router.delete('/:id', controller.deleteExpense);

module.exports = router;
