const AuditLog = require("../models/AuditLog");

function auditAction(action, getDetails) {
  return function auditActionMiddleware(req, _res, next) {
    const res = _res;
    res.on("finish", async () => {
      try {
        if (res.statusCode >= 400) return;
        if (!req.user?.id) return;

        const details = typeof getDetails === "function" ? await getDetails(req, res) : (getDetails || {});

        await AuditLog.create({
          actorId: req.user.id,
          actorEmail: req.user.email || "",
          actorRole: req.user.role || "",
          action,
          target: req.originalUrl || "",
          method: req.method || "",
          statusCode: res.statusCode || 200,
          details,
          ip: req.ip || "",
          userAgent: req.get ? req.get("user-agent") || "" : "",
        });
      } catch (error) {
        console.error("Audit log write failed:", error.message);
      }
    });

    next();
  };
}

module.exports = { auditAction };
