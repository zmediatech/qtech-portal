const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    actorEmail: { type: String, trim: true, lowercase: true },
    actorRole: { type: String, trim: true },
    action: { type: String, required: true, trim: true },
    target: { type: String, trim: true, default: "" },
    method: { type: String, trim: true, default: "" },
    statusCode: { type: Number, default: 200 },
    details: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String, trim: true, default: "" },
    userAgent: { type: String, trim: true, default: "" },
  },
  { timestamps: true, collection: "auditlogs" }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ actorRole: 1, createdAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
