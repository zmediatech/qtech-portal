const AuditLog = require("../models/AuditLog");

async function listAuditLogs(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
    const q = String(req.query.q || "").trim();
    const actorRole = String(req.query.actorRole || "").trim();
    const action = String(req.query.action || "").trim();
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    const filter = {};
    if (q) {
      filter.$or = [
        { actorEmail: { $regex: q, $options: "i" } },
        { action: { $regex: q, $options: "i" } },
        { target: { $regex: q, $options: "i" } },
      ];
    }
    if (actorRole) filter.actorRole = actorRole;
    if (action) filter.action = action;
    if (from || to) {
      filter.createdAt = {};
      if (from && !isNaN(from.getTime())) filter.createdAt.$gte = from;
      if (to && !isNaN(to.getTime())) filter.createdAt.$lte = to;
    }

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      data: logs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
}

module.exports = { listAuditLogs };
