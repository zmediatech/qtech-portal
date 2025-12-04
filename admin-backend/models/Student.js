// models/Student.js
const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const StudentCategory = ['Free', 'Paid'];
const StudentStatus = ['Active', 'Inactive', 'Graduated'];

const StudentSchema = new Schema(
  {
    regNo: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    fatherName: { type: String, trim: true },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9+\-\s()]{7,20}$/, 'Invalid phone format'],
      unique: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    address: { type: String, trim: true },

    class: { type: Types.ObjectId, ref: 'Class', required: true },

    category: { type: String, enum: StudentCategory, required: true, default: 'Paid' },
    status:   { type: String, enum: StudentStatus, required: true, default: 'Active' },

    notes: { type: String, trim: true },

    feeStatus: {
      type: String,
      enum: ['Paid', 'Unpaid', 'Partial', 'Overdue'],
      default: 'Unpaid',
      required: true,
    },

    dateOfBirth: { type: Date },
    admissionDate: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'students' }
);

// --- Indexes (must come AFTER schema is declared)
StudentSchema.index({ name: 'text', fatherName: 'text', regNo: 'text' });

// --- Hooks (defer requiring Class to avoid circular import)

// Add to class on create/save
StudentSchema.post('save', async function (doc, next) {
  try {
    if (doc.class) {
      const ClassModel = require('./Class');
      await ClassModel.updateOne({ _id: doc.class }, { $addToSet: { students: doc._id } });
    }
  } catch (_) {}
  next();
});

// Remove from class on remove()
StudentSchema.post('remove', async function (doc, next) {
  try {
    if (doc?.class) {
      const ClassModel = require('./Class');
      await ClassModel.updateOne({ _id: doc.class }, { $pull: { students: doc._id } });
    }
  } catch (_) {}
  next();
});

// Handle updates that change student.class
StudentSchema.post('findOneAndUpdate', async function (_res, next) {
  try {
    const update = this.getUpdate() || {};
    const newClassId = update.$set?.class || update.class;
    if (newClassId) {
      const doc = await this.model.findOne(this.getQuery());
      if (doc) {
        const ClassModel = require('./Class');
        const oldClassId = doc.class?.toString();
        if (oldClassId && oldClassId !== String(newClassId)) {
          await ClassModel.updateOne({ _id: oldClassId }, { $pull: { students: doc._id } });
        }
        await ClassModel.updateOne({ _id: newClassId }, { $addToSet: { students: doc._id } });
      }
    }
  } catch (_) {}
  next();
});

// Handle deletes done with findOneAndDelete / findByIdAndDelete
StudentSchema.post('findOneAndDelete', async function (doc, next) {
  try {
    if (doc?.class) {
      const ClassModel = require('./Class');
      await ClassModel.updateOne({ _id: doc.class }, { $pull: { students: doc._id } });
    }
  } catch (_) {}
  next();
});

module.exports = model('Student', StudentSchema);
