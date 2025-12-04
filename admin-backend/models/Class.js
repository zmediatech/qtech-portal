// models/Class.js
const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const ClassSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
    subjects: [{ type: Types.ObjectId, ref: 'Subject' }],
    students: [{ type: Types.ObjectId, ref: 'Student' }], // can keep
    courses: [{ type: String, trim: true }],
  },
  { timestamps: true, collection: 'classes' }
);

// ⭐ Virtual: derive students from Student.class
ClassSchema.virtual('studentsVirtual', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'class',
});

ClassSchema.set('toJSON', { virtuals: true });
ClassSchema.set('toObject', { virtuals: true });

module.exports = model('Class', ClassSchema);
