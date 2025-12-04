// routes/metricsRoutes.js
const express = require("express");
const router = express.Router();
const { getIncomeExpense, getStudentCategories } = require("../controllers/metricsController");

// If you want JWT protection: const auth = require("../middleware/auth"); router.use(auth);

router.get("/income-expense", getIncomeExpense);
router.get("/student-categories", getStudentCategories);

module.exports = router;
