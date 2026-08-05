const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const LectureSchema = new Schema(
  {
    course: { type: Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    order: { type: Number, default: 1 },
    resourceUrl: { type: String, trim: true },
    fileName: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    fileSize: { type: Number, default: 0 },
    uploadedBy: { type: Types.ObjectId, ref: 'Users', required: true },
  },
  { timestamps: true, collection: 'lectures' }
);

LectureSchema.index({ course: 1, order: 1 });

module.exports = model('Lecture', LectureSchema);
