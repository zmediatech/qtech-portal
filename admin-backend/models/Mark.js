const mongoose = require("mongoose");

const markSchema = new mongoose.Schema(
  {
    regNo: { type: String, required: true, trim: true },
    studentName: { type: String, required: true, trim: true },
    className: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },

    examTitle: { type: String, default: "Exam" },
    examDate: { type: Date },

    totalMarks: { type: Number, required: true, min: 1 },
    obtainedMarks: { type: Number, required: true, min: 0 },

    percentage: { type: Number, required: true, min: 0, max: 100 },
    grade: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Mark", markSchema);
