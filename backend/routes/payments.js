require('dotenv').config();
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');

// Initialize PayPal
const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
const paypalClient = new paypal.core.PayPalHttpClient(environment);

// --- STRIPE (Apple Pay, Google Pay, Credit/Debit Cards in $) ---
router.post('/stripe/create-payment-intent', async (req, res) => {
  const { amountUsd, tokenCount } = req.body;
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountUsd * 100), // Stripe expects amounts in cents (e.g., $5.00 = 500)
      currency: 'usd',
      automatic_payment_methods: { enabled: true }, // Automatically enables Apple Pay, Google Pay, Cards
      metadata: { tokenCount }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PAYPAL (Global Wallet & Cards) ---
router.post('/paypal/create-order', async (req, res) => {
  const { amountUsd } = req.body;
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [{ amount: { currency_code: "USD", value: amountUsd.toString() } }]
  });

  try {
    const order = await paypalClient.execute(request);
    res.json({ id: order.result.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/paypal/capture', async (req, res) => {
  const { orderID } = req.body;
  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  request.requestGroup = {};

  try {
    const capture = await paypalClient.execute(request);
    res.json({ success: true, capture });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;