// models/Exam.js
const mongoose = require('mongoose');

// ---------- Helpers ----------
function parseDDMMYYYYHHMM(str) {
  if (typeof str !== 'string') return null;
  const m = str.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10) - 1;
  const yyyy = parseInt(m[3], 10);
  const HH = m[4] != null ? parseInt(m[4], 10) : 0;
  const MI = m[5] != null ? parseInt(m[5], 10) : 0;
  const d = new Date(yyyy, mm, dd, HH, MI, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

function coerceStartAt(v) {
  if (!v) return v;
  if (v instanceof Date) return v;
  if (typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d;
  }
  if (typeof v === 'string') {
    const ddmmyy = parseDDMMYYYYHHMM(v);
    if (ddmmyy) return ddmmyy;
    const iso = new Date(v);
    if (!isNaN(iso.getTime())) return iso;
  }
  return v;
}

// ---------- Question Subschema ----------
const QuestionSchema = new mongoose.Schema(
  {
    order: { type: Number, default: 1, min: 1 },

    // Core
    type: {
      type: String,
      enum: ['multiple-choice', 'short-answer', 'essay'],
      required: true,
      default: 'short-answer',
    },
    text: { type: String, required: true, trim: true },

    // MCQ only
    options: {
      type: [String],
      default: undefined,
      required: function () { return this.type === 'multiple-choice'; },
      validate: [
        {
          validator: function (arr) {
            if (this.type !== 'multiple-choice') return true;
            return Array.isArray(arr) && arr.map(s => (s ?? '').trim()).filter(Boolean).length >= 2;
          },
          message: 'A question must have at least two options.',
        },
      ],
    },
    correctOptionIndex: {
      type: Number,
      required: function () { return this.type === 'multiple-choice'; },
      validate: {
        validator: function (v) {
          if (this.type !== 'multiple-choice') return true;
          return (
            Number.isInteger(v) &&
            Array.isArray(this.options) &&
            v >= 0 &&
            v < this.options.length
          );
        },
        message: 'correctOptionIndex must point to one of the options.',
      },
    },

    // Short / Essay only (text/model answer)
    correctAnswerText: {
      type: String,
      trim: true,
      default: '',
    },

    // NEW: universal “answer key only” text (optional, shown only in Answers PDF)
    answerText: {
      type: String,
      trim: true,
      default: '',
    },

    // Common
    marks: { type: Number, default: 1, min: 0 },
    explanation: { type: String, trim: true },
  },
  { _id: false }
);

// Normalize & auto-default before validation
QuestionSchema.pre('validate', function (next) {
  if (!this.type) {
    if (Array.isArray(this.options) && this.options.length >= 2) this.type = 'multiple-choice';
    else this.type = 'short-answer';
  }

  if (this.type === 'multiple-choice') {
    this.correctAnswerText = undefined;

    if (Array.isArray(this.options)) {
      this.options = this.options.map(s => (s ?? '').trim()).filter(Boolean);
    }

    if (
      (this.correctOptionIndex === undefined || this.correctOptionIndex === null) &&
      Array.isArray(this.options) &&
      this.options.length >= 2
    ) {
      this.correctOptionIndex = 0;
    }
  } else {
    this.options = undefined;
    this.correctOptionIndex = undefined;
    if (typeof this.correctAnswerText !== 'string') this.correctAnswerText = '';
  }

  // answerText stays as-is (optional, any type)
  if (typeof this.answerText !== 'string') this.answerText = '';
  next();
});

// ---------- Exam Schema ----------
const ExamSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },

    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },

    className: { type: String, trim: true },
    subjectName: { type: String, trim: true },

    startAt: {
      type: Date,
      required: true,
      set: coerceStartAt,
    },
    durationMinutes: { type: Number, default: 60, min: 1 },

    instructions: { type: String, trim: true, default: '' },

    questions: { type: [QuestionSchema], default: [] },

    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ExamSchema.virtual('endAt').get(function () {
  if (!this.startAt || !this.durationMinutes) return null;
  return new Date(this.startAt.getTime() + this.durationMinutes * 60000);
});

ExamSchema.pre('save', function (next) {
  if (Array.isArray(this.questions)) {
    this.questions.forEach((q, idx) => {
      if (!q.order) q.order = idx + 1;
    });
  }
  next();
});

module.exports = mongoose.model('Exam', ExamSchema);
