const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
const { getSummary } = require("../controllers/reportsController");

const router = express.Router();

router.get("/summary", requireAuth, requireRole("superadmin"), getSummary);

module.exports = router;
