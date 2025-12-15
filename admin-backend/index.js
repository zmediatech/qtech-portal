// index.js (CommonJS – Vercel compatible)
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
require("./models/feeRecord");
require("./models/Expense");
require("./models/Mark");
require("./models/User");

// --- Routers
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
const authRoutes = require("./routes/authRoutes");
const metricsRoutes = require("./routes/metricsRoutes");
const certificateRoutes = require("./routes/certificateRoutes");

const app = express();

/* ------------------ Middleware ------------------ */
app.set("trust proxy", true);

const allowedOrigins = (process.env.CORS_ORIGIN ||
  "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

/* ------------------ Health Check ------------------ */
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "Education Admin Backend",
    env: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

/* ------------------ Routes ------------------ */
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

app.use("/api/auth", authRoutes);
app.use("/api/metrics", metricsRoutes);
app.use("/api/certificates", certificateRoutes);

/* ------------------ 404 ------------------ */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
  });
});

/* ------------------ Error Handler ------------------ */
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

/* ------------------ DB Connection (Serverless-Safe) ------------------ */
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/edu_admin";

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function connectOnce() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = connectDB(MONGODB_URI).then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

connectOnce().catch((err) => {
  console.error("❌ MongoDB connection failed:", err.message);
});

/* ------------------ EXPORT APP (NO listen) ------------------ */
module.exports = app;
