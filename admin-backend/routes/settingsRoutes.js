const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
const { auditAction } = require("../middleware/auditTrail");
const { getSettings, updateSettings } = require("../controllers/settingsController");

const router = express.Router();

router.get("/", requireAuth, requireRole("superadmin"), getSettings);
router.put("/", requireAuth, requireRole("superadmin"), auditAction("settings.update", (req) => ({
  portalName: req.body?.portalName,
  academicYear: req.body?.academicYear,
  maintenanceMode: Boolean(req.body?.maintenanceMode),
  allowStudentEnrollment: Boolean(req.body?.allowStudentEnrollment),
  allowParentCourseView: Boolean(req.body?.allowParentCourseView),
})), updateSettings);

module.exports = router;
