import React, { useState, useEffect } from 'react';
import BattleArena from './components/BattleArena';
import Wallet from './components/Wallet';

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // landing, auth, arena, wallet
  const [user, setUser] = useState(null);
  
  // Auth States
  const [authStep, setAuthStep] = useState(1);
  const [contactMethod, setContactMethod] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- THE FIX: SESSION PERSISTENCE ---
  // When the app loads, check if the user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('loudfb_token');
    const savedUser = localStorage.getItem('loudfb_user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setCurrentView('arena');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('loudfb_token');
    localStorage.removeItem('loudfb_user');
    setUser(null);
    setAuthStep(1);
    setCurrentView('landing');
  };

  // --- AUTHENTICATION LOGIC ---
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: contactMethod })
      });
      const data = await response.json();
      if (data.success) {
        setAuthStep(2);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to connect to backend server.");
    }
    setIsLoading(false);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: contactMethod, otp: otpValue })
      });
      const data = await response.json();
      if (data.success) {
        // Save both the token AND the user profile for instant reloads
        localStorage.setItem('loudfb_token', data.token);
        localStorage.setItem('loudfb_user', JSON.stringify(data.user));
        
        setUser(data.user);
        setCurrentView('arena');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to verify OTP.");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-pink-500 selection:text-white">
      
      {/* Navigation Bar (Only visible when logged in) */}
      {user && (
        <nav className="flex justify-between items-center p-6 bg-gray-900/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
          <h1 
            className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-indigo-500 cursor-pointer hover:scale-105 transition-transform" 
            onClick={() => setCurrentView('arena')}
          >
            LOUDFB
          </h1>
          <div className="flex gap-6 items-center">
            <button 
              onClick={() => setCurrentView('wallet')} 
              className="bg-gray-950 border border-yellow-500/50 px-5 py-2 rounded-xl font-black text-yellow-400 hover:bg-gray-800 transition-colors shadow-[0_0_15px_rgba(250,204,21,0.15)]"
            >
              👛 {user.tokens} TOKENS
            </button>
            <div className="flex items-center gap-4 border-l border-gray-700 pl-6">
              <span className="font-bold text-gray-300">@{user.username}</span>
              <button 
                onClick={handleLogout}
                className="text-sm font-bold text-gray-500 hover:text-pink-500 transition-colors"
              >
                LOGOUT
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Landing Page */}
      {currentView === 'landing' && (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-black">
          <h1 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 mb-6 tracking-tighter drop-shadow-2xl">
            PROVE YOUR LUNGS.
          </h1>
          <p className="text-2xl text-gray-400 mb-12 max-w-2xl font-bold">
            Join the ultimate 1v1 screaming battle. Bet tokens, yell the loudest, and take the pot. 
          </p>
          <button 
            onClick={() => setCurrentView('auth')} 
            className="px-12 py-6 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-black text-3xl rounded-2xl transition-all transform hover:scale-105 shadow-[0_0_40px_rgba(236,72,153,0.4)]"
          >
            ENTER THE ARENA
          </button>
        </div>
      )}

      {/* Auth / OTP Login Page */}
      {currentView === 'auth' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-black">
          <div className="bg-gray-900/60 backdrop-blur-2xl p-10 rounded-[2rem] shadow-[0_0_60px_rgba(236,72,153,0.2)] border border-white/10 w-full max-w-md relative overflow-hidden">
            <h2 className="text-4xl font-black mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400">
              {authStep === 1 ? 'JOIN THE ARENA' : 'VERIFY CODE'}
            </h2>
            <p className="text-gray-400 text-center mb-8 font-bold">
              {authStep === 1 ? 'Enter your email address to receive a secure login code.' : `We sent a 6-digit code to ${contactMethod}`}
            </p>

            {authStep === 1 ? (
              <form onSubmit={handleSendOTP}>
                <input 
                  type="email" 
                  placeholder="Enter your email address" 
                  value={contactMethod}
                  onChange={(e) => setContactMethod(e.target.value)}
                  required 
                  className="w-full p-4 mb-6 bg-gray-950 border border-gray-700 rounded-xl outline-none focus:border-pink-500 transition-colors text-lg text-white font-bold tracking-wide" 
                />
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full py-4 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 font-black text-xl rounded-xl transition-all shadow-lg disabled:opacity-50"
                >
                  {isLoading ? 'SENDING...' : 'SEND OTP CODE'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP}>
                <input 
                  type="text" 
                  maxLength="6"
                  placeholder="• • • • • •" 
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value)}
                  required 
                  className="w-full p-4 mb-6 bg-gray-950 border border-gray-700 rounded-xl outline-none focus:border-pink-500 transition-colors text-4xl text-center text-white font-black tracking-[0.5em]" 
                />
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full py-4 bg-green-500 hover:bg-green-400 text-gray-950 font-black text-xl rounded-xl transition-colors shadow-[0_0_20px_rgba(34,197,94,0.4)] disabled:opacity-50"
                >
                  {isLoading ? 'VERIFYING...' : 'LOGIN NOW'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setAuthStep(1)} 
                  className="w-full mt-6 py-2 text-gray-500 hover:text-white font-bold transition-colors"
                >
                  ← Back to Email
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Main App Views */}
      {currentView === 'arena' && user && <BattleArena userId={user.id} />}
      {currentView === 'wallet' && user && <Wallet user={user} />}
    </div>
  );
}