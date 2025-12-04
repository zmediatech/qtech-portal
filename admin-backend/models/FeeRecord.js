const mongoose = require('mongoose');

const FeeStatus = Object.freeze({
  PAID: 'Paid',
  PENDING: 'Pending',
  UNPAID: 'Unpaid',
});

const PaymentMethod = Object.freeze({
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  ONLINE: 'Online',
  NONE: '-', // to match the UI where method can be "-"
});

const feeRecordSchema = new mongoose.Schema(
  {
    // Core relations
    student:   { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    // If your model is actually 'Class' (from models/Class.js), CHANGE 'Classroom' -> 'Class'
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },

    // Denormalized (for fast table/search without populate)
    regNo:       { type: String, required: true, trim: true },
    studentName: { type: String, required: true, trim: true },
    className:   { type: String, required: true, trim: true },

    // Columns
    feeType: { type: String, required: true, trim: true },
    amount:  { type: Number, required: true, min: 0 },
    date:    { type: Date, required: true },
    method:  { type: String, enum: Object.values(PaymentMethod), default: PaymentMethod.NONE, required: true },
    status:  { type: String, enum: Object.values(FeeStatus), default: FeeStatus.PENDING, required: true },

    // Optional
    referenceNo: { type: String, trim: true },
    notes:       { type: String, trim: true },
  },
  { timestamps: true }
);

// Indexes
feeRecordSchema.index({ regNo: 1 });
feeRecordSchema.index({ studentName: 'text' });
feeRecordSchema.index({ classroom: 1, status: 1, date: 1 });
feeRecordSchema.index({ date: -1 });

// Keep denormalized fields in sync (optional)
feeRecordSchema.pre('validate', async function (next) {
  try {
    if ((!this.regNo || !this.studentName) && this.student) {
      const Student = mongoose.model('Student');
      const s = await Student.findById(this.student).select('regNo firstName lastName fullName name');
      if (s) {
        this.regNo = this.regNo || s.regNo;
        const fullName = s.fullName || s.name || [s.firstName, s.lastName].filter(Boolean).join(' ').trim();
        if (fullName) this.studentName = this.studentName || fullName;
      }
    }
    if (!this.className && this.classroom) {
      // If your model is 'Class', change to mongoose.model('Class')
      const Classroom = mongoose.model('Classroom');
      const c = await Classroom.findById(this.classroom).select('name');
      if (c?.name) this.className = c.name;
    }
    next();
  } catch (e) {
    next(e);
  }
});

// ✅ SAFE REGISTER: prevents OverwriteModelError on hot reloads / multiple requires
module.exports = mongoose.models.FeeRecord || mongoose.model('FeeRecord', feeRecordSchema);
