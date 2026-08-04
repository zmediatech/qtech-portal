// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  leftSignatureDataUrl: { type: String, default: "" },
  rightSignatureDataUrl: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }

});

const UserModel = mongoose.model('Users', UserSchema);
module.exports = UserModel;
