const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const CourseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    teacher: { type: Types.ObjectId, ref: 'Users', required: true },
    scopeType: {
      type: String,
      enum: ['general', 'classwise', 'subjectwise', 'both'],
      default: 'general',
    },
    classIds: [{ type: Types.ObjectId, ref: 'Class' }],
    subjectIds: [{ type: Types.ObjectId, ref: 'Subject' }],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
    },
    coverImageUrl: { type: String, trim: true },
  },
  { timestamps: true, collection: 'courses' }
);

CourseSchema.index({ title: 'text', description: 'text' });

module.exports = model('Course', CourseSchema);
