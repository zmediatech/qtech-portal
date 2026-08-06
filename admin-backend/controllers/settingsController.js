const SystemSetting = require("../models/SystemSetting");

const DEFAULT_SETTINGS = {
  key: "global",
  portalName: "Q Tech Portal",
  academicYear: "2026-2027",
  supportEmail: "support@qtech.local",
  supportPhone: "",
  timezone: "Asia/Karachi",
  maintenanceMode: false,
  allowStudentEnrollment: true,
  allowParentCourseView: true,
  announcementBanner: "",
};

async function getSettings(_req, res) {
  try {
    const settings = await SystemSetting.findOne({ key: "global" }).lean();
    return res.status(200).json({ success: true, data: settings || DEFAULT_SETTINGS });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
}

async function updateSettings(req, res) {
  try {
    const payload = {
      portalName: String(req.body?.portalName || DEFAULT_SETTINGS.portalName).trim(),
      academicYear: String(req.body?.academicYear || DEFAULT_SETTINGS.academicYear).trim(),
      supportEmail: String(req.body?.supportEmail || DEFAULT_SETTINGS.supportEmail).trim().toLowerCase(),
      supportPhone: String(req.body?.supportPhone || "").trim(),
      timezone: String(req.body?.timezone || DEFAULT_SETTINGS.timezone).trim(),
      maintenanceMode: Boolean(req.body?.maintenanceMode),
      allowStudentEnrollment: Boolean(req.body?.allowStudentEnrollment),
      allowParentCourseView: Boolean(req.body?.allowParentCourseView),
      announcementBanner: String(req.body?.announcementBanner || "").trim(),
      updatedBy: req.user?.id,
    };

    const settings = await SystemSetting.findOneAndUpdate(
      { key: "global" },
      { $set: { key: "global", ...payload } },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    return res.status(200).json({ success: true, message: "Settings updated successfully", data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
}

module.exports = { getSettings, updateSettings, DEFAULT_SETTINGS };
