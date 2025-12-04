const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

// Define the Attendance Schema
const AttendanceSchema = new Schema(
  {
    date: { 
      type: Date, 
      required: true 
    }, 
    class: { 
      type: Types.ObjectId, 
      ref: 'Class', 
      required: true 
    },
    totalStudents: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    presentStudents: [{ 
      type: Types.ObjectId, 
      ref: 'Student' 
    }],
    absentStudents:  [{ 
      type: Types.ObjectId, 
      ref: 'Student' 
    }],
    lateStudents:    [{ 
      type: Types.ObjectId, 
      ref: 'Student' 
    }],
    notes: { 
      type: String, 
      trim: true 
    },
  },
  { timestamps: true, collection: 'attendances' }
);

// Ensure no duplicate attendance for the same class and date
AttendanceSchema.index({ class: 1, date: 1 }, { unique: true });

// Pre-save hook to normalize date to UTC midnight and ensure no student is marked multiple times
AttendanceSchema.pre('save', function (next) {
  if (this.date) {
    const d = new Date(this.date);
    d.setUTCHours(0, 0, 0, 0); // Normalize to midnight
    this.date = d;
  }

  const toIds = arr => (arr || []).map(String);
  const allStudents = [
    ...toIds(this.presentStudents), 
    ...toIds(this.absentStudents), 
    ...toIds(this.lateStudents)
  ];
  const uniqueStudents = new Set(allStudents);

  if (uniqueStudents.size !== allStudents.length) {
    return next(new Error('A student cannot appear in multiple attendance categories.'));
  }

  if (this.totalStudents < uniqueStudents.size) {
    return next(new Error('totalStudents cannot be less than the number of marked students.'));
  }

  next();
});

module.exports = model('Attendance', AttendanceSchema);
