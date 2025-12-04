// models/subject.js
const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const SubjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    linkedClasses: [{ type: Types.ObjectId, ref: 'Class' }],
  },
  { timestamps: true, collection: 'subjects' }
);


SubjectSchema.index({ name: 1 });
SubjectSchema.index({ code: 1 }, { unique: true });

module.exports = model('Subject', SubjectSchema);