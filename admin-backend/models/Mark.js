const mongoose = require("mongoose");

const markSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },

    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      default: null,
      index: true,
    },

    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },

    obtainedMarks: {
      type: Number,
      required: true,
      min: 0,
    },

    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    grade: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// 🔒 Prevent duplicate marks for same student + subject + exam
markSchema.index(
  { student: 1, subject: 1, exam: 1 },
  { unique: true, partialFilterExpression: { exam: { $ne: null } } }
);

module.exports = mongoose.model("Mark", markSchema);
