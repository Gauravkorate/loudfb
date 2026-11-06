require('dotenv').config();
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const JWT_SECRET = 'loudfb_super_secret_key_2026';
const usersDB = new Map();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

router.post('/send-otp', async (req, res) => {
  const { contact } = req.body;
  if (!contact || !contact.includes('@')) return res.status(400).json({ error: 'Invalid email.' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
  const otpExpires = Date.now() + 5 * 60 * 1000; 

  if (!usersDB.has(contact)) {
    usersDB.set(contact, { email: contact, tokens: 100, usedCoupon: false });
  }
  
  const user = usersDB.get(contact);
  user.otp = otp;
  user.otpExpires = otpExpires;

  try {
    await transporter.sendMail({
      from: `"Loudfb Arena" <${process.env.EMAIL_USER}>`,
      to: contact,
      subject: 'Loudfb Login Code',
      text: `Your LOUDFB verification code is: ${otp}\n\nIt expires in 5 minutes.`
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Email failed.' });
  }
});

router.post('/verify-otp', (req, res) => {
  const { contact, otp } = req.body;
  const user = usersDB.get(contact);

  if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  const userId = `user_${Math.floor(Math.random() * 10000)}`;
  const token = jwt.sign({ id: userId, email: contact }, JWT_SECRET, { expiresIn: '7d' });

  res.json({ success: true, token, user: { id: userId, username: contact.split('@')[0], tokens: user.tokens, email: contact } });
});

// NEW: Coupon Redemption Route
router.post('/redeem-coupon', (req, res) => {
  const { email, code } = req.body;
  const user = usersDB.get(email);

  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.usedCoupon) return res.status(400).json({ error: 'You have already used a coupon code.' });
  
  if (code.toUpperCase() === 'LOUD2026' || code.toUpperCase() === 'FREECOINS') {
    user.tokens += 50; // Give 50 free tokens
    user.usedCoupon = true;
    return res.json({ success: true, newBalance: user.tokens, message: '50 Tokens Added!' });
  }
  
  return res.status(400).json({ error: 'Invalid coupon code.' });
});

module.exports = router;