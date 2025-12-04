// index.js (CommonJS only — no ES imports)
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");

// --- Register Mongoose models once
require("./models/subject");
require("./models/Class");
require("./models/Student");
require("./models/TimetableSlot");
require("./models/Attendance");
require("./models/Exam");
require("./models/feeRecord"); // <-- match actual filename casing
require("./models/Expense");
require("./models/Mark");
require("./models/User");

// --- Routers (CommonJS)
const subjectRoutes = require("./routes/subjectRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const classRoutes = require("./routes/classRoutes");
const studentRoutes = require("./routes/studentRoutes");
const timetableSlotRoutes = require("./routes/timetableSlotRoutes");
const examRoutes = require("./routes/examRoutes");
const feeRecordRoutes = require("./routes/feeRecordRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const marksRoutes = require("./routes/marksRoutes");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");             // /api/auth/...
const metricsRoutes = require("./routes/metricsRoutes");       // /api/metrics/...
const certificateRoutes = require("./routes/certificateRoutes"); // ✅ NEW: /api/certificates/...

const app = express();

// --- Basic hardening + parsing
app.set("trust proxy", true);

// Allow your front-end(s) by default (3000/3001)
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map(s => s.trim());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// --- Health
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "Education Admin Backend",
    timestamp: new Date().toISOString(),
  });
});

// --- TEMP test endpoint (keep or remove)
app.post("/api/expenses/test", (_req, res) => {
  console.log("🔍 Test route hit: /api/expenses/test");
  res.json({ message: "Expense test route reached!" });
});

// --- Mount API routes
app.use("/api/subjects", subjectRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/timetable-slots", timetableSlotRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/fee-records", feeRecordRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/marks", marksRoutes);
app.use("/api/users", userRoutes);

app.use("/api/auth", authRoutes);            // signup/login/logout, etc.
app.use("/api/metrics", metricsRoutes);      // charts data
app.use("/api/certificates", certificateRoutes); // ✅ certificate PDF generator

// --- 404 handler (after all routes)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
  });
});

// --- Error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

// --- Start server
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/edu_admin";

connectDB(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  });
