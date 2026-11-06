const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');

// Endpoint for user to buy tokens (e.g., $5 for 500 tokens)
router.post('/buy-tokens', async (req, res) => {
  const { userId, amountUsd } = req.body; // e.g., 5.00
  const tokensToCredit = amountUsd * 100; // 1 cent = 1 token

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountUsd * 100, // Stripe expects cents
      currency: 'usd',
      metadata: { userId, tokensToCredit }
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for withdrawal (Token to Fiat)
router.post('/withdraw', async (req, res) => {
  const { userId, tokenAmount, destinationAccountId } = req.body;

  try {
    const user = await User.findById(userId);
    if(user.tokens < tokenAmount) return res.status(400).json({ error: 'Insufficient balance' });

    // Deduct tokens
    user.tokens -= tokenAmount;
    await user.save();

    // Transfer real money via Stripe Connect (Requires user to have an connected Express/Custom Stripe account)
    const transfer = await stripe.transfers.create({
      amount: Math.floor(tokenAmount * 0.90), // 10% platform withdrawal fee
      currency: "usd",
      destination: destinationAccountId, 
    });

    res.json({ success: true, transferId: transfer.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;