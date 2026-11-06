const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, sparse: true }, 
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  tokens: { type: Number, default: 100 }, 
  otp: { type: String }, 
  otpExpires: { type: Date }, 
  createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('User', UserSchema);