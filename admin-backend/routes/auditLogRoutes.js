const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
const { listAuditLogs } = require("../controllers/auditLogController");

const router = express.Router();

router.get("/", requireAuth, requireRole("superadmin"), listAuditLogs);

module.exports = router;
