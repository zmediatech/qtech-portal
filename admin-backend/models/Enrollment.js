const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const EnrollmentSchema = new Schema(
  {
    course: { type: Types.ObjectId, ref: 'Course', required: true },
    user: { type: Types.ObjectId, ref: 'Users', required: true },
    student: { type: Types.ObjectId, ref: 'Student' },
    enrolledBy: { type: Types.ObjectId, ref: 'Users' },
    source: {
      type: String,
      enum: ['manual', 'self', 'classwise', 'subjectwise'],
      default: 'self',
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed'],
      default: 'active',
    },
  },
  { timestamps: true, collection: 'enrollments' }
);

EnrollmentSchema.index({ course: 1, user: 1 }, { unique: true });

module.exports = model('Enrollment', EnrollmentSchema);
