require('dotenv').config();
const express = require('express');
const router = express.Router();

// Initialize Stripe only if API key is provided
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('⚠️  Stripe is not configured. Payment endpoints will return 503.');
}

// Initialize PayPal only if credentials are provided
let paypalClient = null;
if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
  const paypal = require('@paypal/checkout-server-sdk');
  const environment = new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  );
  paypalClient = new paypal.core.PayPalHttpClient(environment);
} else {
  console.warn('⚠️  PayPal is not configured. Payment endpoints will return 503.');
}

// --- STRIPE (Apple Pay, Google Pay, Credit/Debit Cards in $) ---
router.post('/stripe/create-payment-intent', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe payment gateway is not configured' });
  }

  const { amountUsd, tokenCount } = req.body;
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountUsd * 100),
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: { tokenCount }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PAYPAL (Global Wallet & Cards) ---
router.post('/paypal/create-order', async (req, res) => {
  if (!paypalClient) {
    return res.status(503).json({ error: 'PayPal payment gateway is not configured' });
  }

  const { amountUsd } = req.body;
  const paypal = require('@paypal/checkout-server-sdk');
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
  if (!paypalClient) {
    return res.status(503).json({ error: 'PayPal payment gateway is not configured' });
  }

  const { orderID } = req.body;
  const paypal = require('@paypal/checkout-server-sdk');
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
