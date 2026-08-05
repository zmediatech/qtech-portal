// models/User.js
const mongoose = require('mongoose');

const UserRoles = ['admin', 'teacher', 'student', 'parent'];

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: UserRoles, default: 'student', index: true },
  studentClass: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  parentStudentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  assignedClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  assignedSubjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  leftSignatureDataUrl: { type: String, default: "" },
  rightSignatureDataUrl: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }

});

const UserModel = mongoose.model('Users', UserSchema);
module.exports = UserModel;
