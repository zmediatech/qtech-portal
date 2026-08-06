const mongoose = require("mongoose");

const SystemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    portalName: { type: String, trim: true, default: "Q Tech Portal" },
    academicYear: { type: String, trim: true, default: "2026-2027" },
    supportEmail: { type: String, trim: true, lowercase: true, default: "support@qtech.local" },
    supportPhone: { type: String, trim: true, default: "" },
    timezone: { type: String, trim: true, default: "Asia/Karachi" },
    maintenanceMode: { type: Boolean, default: false },
    allowStudentEnrollment: { type: Boolean, default: true },
    allowParentCourseView: { type: Boolean, default: true },
    announcementBanner: { type: String, trim: true, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
  },
  { timestamps: true, collection: "systemsettings" }
);

module.exports = mongoose.models.SystemSetting || mongoose.model("SystemSetting", SystemSettingSchema);
