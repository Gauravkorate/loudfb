const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  tokens: { type: Number, default: 100 }, // 1 token = 1 cent
  totalWins: { type: Number, default: 0 },
  stripeCustomerId: { type: String }, // For saved payment methods
  walletAddress: { type: String }, // If integrating Crypto later
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);