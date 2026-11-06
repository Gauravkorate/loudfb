import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe("pk_test_your_stripe_publishable_key_here");

function CheckoutForm({ selectedOrder, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message);
      setIsProcessing(false);
    } else {
      setIsProcessing(false);
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mb-6 bg-black/40 p-4 rounded-xl border border-gray-800">
        <PaymentElement />
      </div>
      {errorMessage && <div className="text-red-500 text-sm mb-4 font-bold">{errorMessage}</div>}
      <button
        disabled={isProcessing || !stripe || !elements}
        className="w-full py-4 bg-gradient-to-r from-pink-600 to-indigo-600 text-white font-black rounded-xl text-xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
      >
        {isProcessing ? "PROCESSING..." : `PAY $${selectedOrder.price} USD`}
      </button>
    </form>
  );
}

export default function Wallet({ user }) {
  const [customAmount, setCustomAmount] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [gatewayChoice, setGatewayChoice] = useState(null); 
  const [couponCode, setCouponCode] = useState("");
  
  // Single Withdrawal State
  const [withdrawAmount, setWithdrawAmount] = useState(0);

  const packages = [
    { tokens: 10, price: 5.0, popular: false },
    { tokens: 100, price: 49.0, popular: true },
    { tokens: 1000, price: 480.0, popular: false },
  ];

  const calculateCustomPrice = (amount) => {
    if (amount < 10) return 0;
    if (amount >= 1000) return (amount * 0.48).toFixed(2);
    if (amount >= 100) return (amount * 0.49).toFixed(2);
    return (amount * 0.5).toFixed(2);
  };

  const handleRedeemCoupon = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/auth/redeem-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, code: couponCode }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message); 
        window.location.reload(); 
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to redeem coupon.");
    }
  };

  const handleSelectPackage = async (price, tokenCount) => {
    if (tokenCount < 10) return alert("Minimum purchase is 10 tokens.");
    setSelectedOrder({ price, tokenCount });
    setShowModal(true);
    setGatewayChoice(null); 

    try {
      const res = await fetch("http://localhost:3001/api/payments/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd: price, tokenCount }),
      });
      const data = await res.json();
      setClientSecret(data.clientSecret);
    } catch (err) {
      console.error("Stripe Intent Error:", err);
    }
  };

  const handlePayPalPayment = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/payments/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd: selectedOrder.price }),
      });
      await res.json();
      alert(`PayPal Global Checkout initiated for $${selectedOrder.price} USD!`);
      setShowModal(false);
      alert(`Success! Added ${selectedOrder.tokenCount} tokens to your account.`);
    } catch (err) {
      alert("PayPal failed.");
    }
  };

  // Condition-checked withdrawal handler
  const handleWithdrawSubmit = () => {
    if (withdrawAmount < 140) {
      return alert("Withdrawal Failed: Minimum withdrawal is 140 tokens ($70 USD).");
    }
    if (withdrawAmount > user.tokens) {
      return alert(`Withdrawal Failed: You only have ${user.tokens} tokens available.`);
    }
    
    // If it passes both conditions, show success!
    alert(`Success! Withdrawal request for ${withdrawAmount} tokens submitted. Funds will arrive in 7 days.`);
    setWithdrawAmount(0); // Reset input box
  };

  return (
    <div className="max-w-5xl mx-auto p-6 mt-8 font-sans text-white relative">
      <div className="bg-gray-900/80 backdrop-blur-2xl rounded-[2rem] p-10 border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-10 border-b border-gray-800 pb-8">
          <div>
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400 mb-2">YOUR WALLET</h2>
            <p className="text-gray-400 text-xl">Global Payments in USD ($) via Apple Pay, Cards & PayPal.</p>
          </div>
          <div className="bg-gray-950 px-8 py-4 rounded-2xl border border-yellow-500/30">
            <p className="text-gray-400 text-sm font-bold mb-1 uppercase">Balance</p>
            <p className="text-4xl text-yellow-400 font-black">{user.tokens} <span className="text-2xl">🪙</span></p>
          </div>
        </div>

        <h3 className="text-3xl font-black mb-8">Buy Tokens (Global USD Pricing)</h3>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {packages.map((pkg, i) => (
            <div key={i} className={`relative bg-gray-950/50 p-8 rounded-3xl border transition-all duration-300 hover:scale-105 flex flex-col items-center ${pkg.popular ? "border-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.2)]" : "border-gray-800"}`}>
              {pkg.popular && <span className="absolute -top-4 bg-pink-600 text-white text-xs font-black px-4 py-1 rounded-full shadow-lg">MOST POPULAR</span>}
              <div className="text-5xl mb-4">🪙</div>
              <div className="text-4xl font-black mb-1">{pkg.tokens}</div>
              <div className="text-gray-400 font-bold mb-8 uppercase text-sm">Tokens</div>
              <button onClick={() => handleSelectPackage(pkg.price.toFixed(2), pkg.tokens)} className="w-full py-4 bg-pink-600 hover:bg-pink-500 text-white font-black rounded-xl text-xl transition-all shadow-lg">
                ${pkg.price.toFixed(2)} USD
              </button>
            </div>
          ))}
        </div>

        {/* Custom Amount */}
        <div className="bg-gradient-to-r from-gray-950 to-gray-900 p-8 rounded-3xl border border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex-1">
            <h4 className="text-2xl font-black mb-2">Custom Amount</h4>
            <p className="text-gray-400 text-sm">Minimum 10 tokens. Automatic volume discounts applied!</p>
          </div>
          <div className="flex items-center gap-4 flex-1 w-full">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🪙</span>
              <input type="number" min="10" value={customAmount} onChange={(e) => setCustomAmount(Number(e.target.value))} className="w-full bg-black border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-2xl font-black text-white outline-none" />
            </div>
            <button onClick={() => handleSelectPackage(calculateCustomPrice(customAmount), customAmount)} disabled={customAmount < 10} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 px-8 rounded-xl text-xl">
              ${calculateCustomPrice(customAmount)} USD
            </button>
          </div>
        </div>

        {/* Promo Code Section */}
        <div className="bg-gray-950 p-8 rounded-3xl border border-pink-500/50 mb-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <h4 className="text-2xl font-black mb-2 text-pink-500">Have a Promo Code?</h4>
            <p className="text-gray-400 text-sm">Enter it here to claim free Arena Tokens.</p>
          </div>
          <div className="flex items-center gap-4 flex-1 w-full">
            <input type="text" placeholder="Enter Code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="w-full bg-black border border-gray-700 rounded-xl py-4 px-6 text-xl font-bold text-white outline-none focus:border-pink-500 uppercase" />
            <button onClick={handleRedeemCoupon} className="bg-pink-600 hover:bg-pink-500 text-white font-black py-4 px-8 rounded-xl text-xl">REDEEM</button>
          </div>
        </div>

        {/* --- SIMPLE WITHDRAWAL BOX --- */}
        <div className="border-t border-gray-800 pt-10 mt-10">
          <h3 className="text-4xl font-black mb-2">Withdraw AMOUNT</h3>
          <p className="text-gray-400 mb-8 text-lg">Convert your won tokens back to real money.</p>
          
          <div className="bg-gray-950 border border-gray-800 p-6 rounded-2xl max-w-lg">
            <label className="block text-gray-400 font-bold mb-2 uppercase text-sm">Tokens to Withdraw</label>
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🪙</span>
              <input 
                type="number" 
                value={withdrawAmount} 
                onChange={(e) => setWithdrawAmount(Number(e.target.value))} 
                className="w-full bg-black border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-2xl font-black text-white outline-none focus:border-indigo-500" 
              />
            </div>
            
            <button 
              onClick={handleWithdrawSubmit}
              className="w-full py-5 bg-transparent border-2 border-gray-600 hover:border-white text-gray-300 hover:text-white font-black rounded-xl transition-all text-xl"
            >
              REQUEST WITHDRAWAL
            </button>
          </div>
        </div>

      </div>

      {/* Payment Gateway Modal */}
      {showModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center rounded-[2rem] p-6">
          <div className="bg-gray-900 border border-gray-700 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white font-black text-2xl">✕</button>
            <h3 className="text-3xl font-black mb-2 text-center">Global Checkout</h3>
            <p className="text-pink-500 text-center mb-6 font-bold text-xl">${selectedOrder?.price} USD for {selectedOrder?.tokenCount} Tokens</p>

            {!gatewayChoice ? (
              <div className="flex flex-col gap-4">
                <button onClick={() => setGatewayChoice("stripe")} className="w-full py-4 bg-white text-black font-black rounded-xl text-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                   Pay / Google Pay / Global Cards 💳
                </button>
                <button onClick={() => { setGatewayChoice("paypal"); handlePayPalPayment(); }} className="w-full py-4 bg-[#FFC439] text-[#003087] font-black rounded-xl text-xl hover:bg-[#f5b822] transition-colors">
                  Pay with PayPal
                </button>
              </div>
            ) : gatewayChoice === "stripe" && clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm selectedOrder={selectedOrder} onSuccess={() => { setShowModal(false); alert(`Success! Added ${selectedOrder.tokenCount} tokens.`); }} />
              </Elements>
            ) : (
              <div className="text-center py-8 text-gray-400 font-bold">Loading secure payment gateway...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}