import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { AudioScorer } from "../utils/audioScorer";

const socket = io("http://localhost:3001");

export default function BattleArena({ userId }) {
  const [gameState, setGameState] = useState("lobby"); 
  const [lobbyTab, setLobbyTab] = useState("public"); 
  const [privateAction, setPrivateAction] = useState("host"); 
  
  const [pot, setPot] = useState(0);
  const [result, setResult] = useState(null);
  const [countdownTimer, setCountdownTimer] = useState(3);
  const [liveVolume, setLiveVolume] = useState(0);

  // Private Match States
  const [hostBetAmount, setHostBetAmount] = useState(10);
  const [hostDuration, setHostDuration] = useState(7); // Default 7 seconds
  const [joinPasscode, setJoinPasscode] = useState("");
  const [generatedPasscode, setGeneratedPasscode] = useState(null);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const audioScorerRef = useRef(new AudioScorer());
  const peerConnectionRef = useRef(null);
  const durationRef = useRef(7000); // Stores the dynamic match duration
  const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  useEffect(() => {
    // We now receive the specific duration from the server
    socket.on('match-found', async ({ roomId, pot, duration }) => {
      setGameState('waiting-webrtc');
      setPot(pot);
      durationRef.current = duration; // Save the duration for this match
      await setupWebRTC(roomId);
      setTimeout(() => socket.emit('audio-ready', { roomId }), 2000);
    });

    socket.on('private-hosted', ({ passcode }) => {
      setGeneratedPasscode(passcode);
    });

    socket.on('private-error', (msg) => {
      alert(msg);
      setGameState("lobby");
    });

    socket.on('start-countdown', () => {
      setGameState('countdown');
      let count = 3;
      setCountdownTimer(count);
      
      const countInterval = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdownTimer(count);
        } else {
          clearInterval(countInterval);
          startShoutingPhase();
        }
      }, 1000);
    });

    socket.on('game-over', (data) => {
      setGameState('gameover');
      setResult(data);
    });
  }, []);

  const startShoutingPhase = () => {
    setGameState('shouting');
    audioScorerRef.current.start();

    const visualizerInterval = setInterval(() => {
      if (audioScorerRef.current.dataArray) {
        const avg = audioScorerRef.current.dataArray.reduce((a,b)=>a+b, 0) / audioScorerRef.current.dataArray.length;
        setLiveVolume(avg);
      }
    }, 50);

    // DYNAMIC TIMEOUT: Uses exactly what was set (7s, 10s, 15s, or custom)
    setTimeout(() => {
      clearInterval(visualizerInterval);
      const finalScore = audioScorerRef.current.stopAndGetFinalScore();
      socket.emit('submit-score', { roomId: socket.roomId, score: finalScore });
      setGameState('calculating');
    }, durationRef.current);
  };

  const setupWebRTC = async (roomId) => {
    socket.roomId = roomId;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };
  };

  // Passes duration directly to server (convert to ms)
  const joinPublicTier = (amount, durationSecs) => {
    socket.emit("find-match", { userId, betAmount: amount, duration: durationSecs * 1000 });
    setGameState("waiting");
  };

  // Passes custom host duration to server
  const hostPrivateMatch = () => {
    if (hostDuration < 3) return alert("Minimum time is 3 seconds!");
    socket.emit("host-private", { userId, betAmount: hostBetAmount, duration: hostDuration * 1000 });
    setGameState("waiting-private");
  };

  const joinPrivateMatch = () => {
    if (!joinPasscode) return alert("Enter a passcode.");
    socket.emit("join-private", { userId, passcode: joinPasscode });
    setGameState("waiting");
  };

  return (
    <div className="relative min-h-[90vh] bg-gray-950 text-white font-sans flex flex-col items-center justify-center p-6 overflow-hidden">
      
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-pink-600 rounded-full mix-blend-screen blur-[120px] opacity-30 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen blur-[120px] opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>

      <h1 className="relative z-20 text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-500 mb-8 tracking-tighter drop-shadow-2xl">
        EARN BY BEING LOUDEST
      </h1>

      {gameState === "lobby" && (
        <div className="relative z-20 w-full max-w-2xl bg-gray-900/80 backdrop-blur-2xl p-8 rounded-[2rem] shadow-[0_0_60px_rgba(236,72,153,0.2)] border border-white/10">
          
          <div className="flex bg-gray-950 rounded-xl p-2 mb-8 border border-gray-800">
            <button 
              onClick={() => setLobbyTab('public')}
              className={`flex-1 py-3 rounded-lg font-black text-lg transition-all ${lobbyTab === 'public' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
              🌐 PUBLIC ARENAS
            </button>
            <button 
              onClick={() => setLobbyTab('private')}
              className={`flex-1 py-3 rounded-lg font-black text-lg transition-all ${lobbyTab === 'private' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
              🔒 PRIVATE MATCH
            </button>
          </div>

          {/* --- PUBLIC ARENAS VIEW --- */}
          {lobbyTab === 'public' && (
            <div className="text-center">
              <p className="text-gray-400 mb-6 font-bold uppercase tracking-widest text-sm">Select Your Tier & Time Limit</p>
              <div className="grid grid-cols-3 gap-6">
                
                <div onClick={() => joinPublicTier(10, 7)} className="bg-gray-950 border border-gray-700 hover:border-pink-500 p-6 rounded-2xl cursor-pointer transition-all hover:scale-105 flex flex-col items-center">
                  <span className="text-4xl mb-2">🪙</span>
                  <span className="text-3xl font-black">10</span>
                  <span className="text-xs text-gray-500 font-bold uppercase mt-2">Tokens</span>
                  <span className="mt-3 bg-pink-500/20 text-pink-400 text-xs px-3 py-1 rounded-full font-bold">⏱️ 7 SEC YELL</span>
                </div>

                <div onClick={() => joinPublicTier(50, 10)} className="bg-gray-950 border border-gray-700 hover:border-purple-500 p-6 rounded-2xl cursor-pointer transition-all hover:scale-105 flex flex-col items-center relative">
                  <span className="absolute -top-3 bg-purple-600 text-xs px-3 py-1 rounded-full font-black">POPULAR</span>
                  <span className="text-4xl mb-2 mt-2">🪙</span>
                  <span className="text-3xl font-black">50</span>
                  <span className="text-xs text-gray-500 font-bold uppercase mt-2">Tokens</span>
                  <span className="mt-3 bg-purple-500/20 text-purple-400 text-xs px-3 py-1 rounded-full font-bold">⏱️ 10 SEC YELL</span>
                </div>

                <div onClick={() => joinPublicTier(100, 15)} className="bg-gray-950 border border-gray-700 hover:border-indigo-500 p-6 rounded-2xl cursor-pointer transition-all hover:scale-105 flex flex-col items-center">
                  <span className="text-4xl mb-2">💎</span>
                  <span className="text-3xl font-black text-indigo-400">100</span>
                  <span className="text-xs text-gray-500 font-bold uppercase mt-2">Tokens</span>
                  <span className="mt-3 bg-indigo-500/20 text-indigo-400 text-xs px-3 py-1 rounded-full font-bold">⏱️ 15 SEC YELL</span>
                </div>

              </div>
            </div>
          )}

          {/* --- PRIVATE MATCH VIEW --- */}
          {lobbyTab === 'private' && (
            <div>
              <div className="flex justify-center gap-4 mb-8">
                <button onClick={() => setPrivateAction('host')} className={`px-6 py-2 rounded-full font-black text-sm border-2 transition-all ${privateAction === 'host' ? 'border-pink-500 bg-pink-500/20 text-white' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}>HOST GAME</button>
                <button onClick={() => setPrivateAction('join')} className={`px-6 py-2 rounded-full font-black text-sm border-2 transition-all ${privateAction === 'join' ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}>JOIN GAME</button>
              </div>

              {privateAction === 'host' ? (
                <div className="text-center">
                  <p className="text-gray-400 mb-4 font-bold">Set the Wager & Time Limit</p>
                  
                  <div className="flex gap-4 justify-center mb-6 w-full max-w-sm mx-auto">
                    <div className="flex flex-col flex-1">
                      <label className="text-xs font-bold text-gray-500 mb-1 uppercase">Bet (Tokens)</label>
                      <div className="flex items-center bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 focus-within:border-pink-500 transition-colors">
                        <span className="text-xl mr-2">🪙</span>
                        <input type="number" min="10" value={hostBetAmount} onChange={(e) => setHostBetAmount(Number(e.target.value))} className="w-full bg-transparent text-center text-2xl font-black text-white outline-none" />
                      </div>
                    </div>
                    <div className="flex flex-col flex-1">
                      <label className="text-xs font-bold text-gray-500 mb-1 uppercase">Time (Seconds)</label>
                      <div className="flex items-center bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 focus-within:border-indigo-500 transition-colors">
                        <span className="text-xl mr-2">⏱️</span>
                        <input type="number" min="3" max="30" value={hostDuration} onChange={(e) => setHostDuration(Number(e.target.value))} className="w-full bg-transparent text-center text-2xl font-black text-white outline-none" />
                      </div>
                    </div>
                  </div>

                  <button onClick={hostPrivateMatch} className="w-full max-w-sm mx-auto py-4 font-black text-xl rounded-xl text-white bg-pink-600 hover:bg-pink-500 shadow-lg transition-colors block">GENERATE PASSCODE</button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-400 mb-4 font-bold">Enter your friend's 6-Digit Passcode</p>
                  <input type="text" maxLength="6" placeholder="------" value={joinPasscode} onChange={(e) => setJoinPasscode(e.target.value)} className="w-full max-w-xs mx-auto block bg-gray-950 border border-gray-700 rounded-xl px-6 py-4 mb-6 text-center text-4xl font-black tracking-widest text-white outline-none focus:border-indigo-500 uppercase" />
                  <button onClick={joinPrivateMatch} className="w-full max-w-xs py-4 font-black text-xl rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg transition-colors">JOIN ARENA</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {gameState === "waiting-private" && (
        <div className="z-20 text-center bg-gray-900/90 backdrop-blur-md p-10 rounded-3xl border border-pink-500 shadow-[0_0_50px_rgba(236,72,153,0.3)]">
          <h3 className="text-2xl font-black text-gray-300 mb-2">ROOM CREATED</h3>
          <p className="text-gray-400 font-bold mb-6">Share this code with your opponent:</p>
          <div className="text-7xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-500 mb-8 select-all">
            {generatedPasscode || "..."}
          </div>
          <p className="text-yellow-400 font-black animate-pulse">WAITING FOR OPPONENT...</p>
        </div>
      )}

      {gameState === "waiting" && (
        <div className="z-20 text-center">
          <h2 className="text-5xl font-black text-white animate-pulse">SEARCHING ARENA...</h2>
        </div>
      )}

      {(gameState === 'waiting-webrtc' || gameState === 'countdown' || gameState === 'shouting' || gameState === 'calculating') && (
        <div className="relative z-20 w-full max-w-5xl">
          <div className="flex justify-between items-center bg-white/5 backdrop-blur-md p-6 rounded-2xl mb-6 border border-white/10 shadow-2xl">
            <span className="text-3xl font-black text-yellow-400">POT: {pot} 🪙</span>
            <span className={`text-4xl font-black ${gameState === "shouting" ? "text-pink-500 animate-pulse" : "text-indigo-400"}`}>
              {gameState === "countdown" && `SHOUT IN: ${countdownTimer}`}
              {gameState === "shouting" && `🔥 YELL NOW FOR ${durationRef.current / 1000}s! 🔥`}
              {gameState === "calculating" && "CALCULATING SCORES..."}
              {gameState === "waiting-webrtc" && "CONNECTING VIDEO..."}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-8 relative">
            <div className="relative group">
              <div className={`absolute -inset-2 bg-gradient-to-r from-pink-600 to-purple-600 rounded-3xl blur opacity-70 ${gameState === "shouting" ? "animate-pulse" : "opacity-20"}`}></div>
              <video ref={localVideoRef} autoPlay muted className="relative w-full rounded-2xl border-2 border-white/20 object-cover bg-black aspect-video z-10" />
              <div className="absolute bottom-4 left-4 z-20 bg-black/80 px-4 py-1 rounded-lg text-pink-500 font-black">YOU</div>
            </div>
            
            <div className="relative group">
              <div className={`absolute -inset-2 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-3xl blur opacity-70 ${gameState === "shouting" ? "animate-pulse" : "opacity-20"}`}></div>
              <video ref={remoteVideoRef} autoPlay className="relative w-full rounded-2xl border-2 border-white/20 object-cover bg-black aspect-video z-10" />
              <div className="absolute bottom-4 left-4 z-20 bg-black/80 px-4 py-1 rounded-lg text-indigo-400 font-black">OPPONENT</div>
            </div>

            {gameState === 'countdown' && (
              <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                <span className="text-[200px] font-black text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.8)] animate-ping">{countdownTimer}</span>
              </div>
            )}
          </div>

          {gameState === 'shouting' && (
            <div className="absolute inset-x-0 bottom-[-100px] flex justify-center z-30">
              <div className="w-full max-w-2xl bg-black/60 border border-pink-500/50 rounded-2xl p-4 h-24 flex items-end justify-center gap-2 backdrop-blur-md">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="w-4 bg-gradient-to-t from-pink-500 to-yellow-400 rounded-t transition-all duration-75"
                    style={{ height: `${Math.min(100, Math.max(10, liveVolume * (Math.random() * 0.8 + 0.5)))}%` }}>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {gameState === "gameover" && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center z-50">
          <h2 className={`text-8xl font-black mb-2 ${result.result === "win" ? "text-green-400 drop-shadow-[0_0_40px_rgba(74,222,128,0.5)]" : "text-red-500 drop-shadow-[0_0_40px_rgba(239,68,68,0.5)]"}`}>
            {result.result === "win" ? "VICTORY!" : "DEFEATED."}
          </h2>
          <p className="text-3xl text-white font-bold mb-8">Your Score: {result.myScore} | Opponent: {result.oppScore}</p>
          {result.result === "win" && <p className="text-5xl text-yellow-400 font-black mb-12 animate-bounce">+{result.tokensWon} TOKENS</p>}
          <button onClick={() => window.location.reload()} className="px-12 py-6 bg-white text-black font-black text-2xl rounded-2xl hover:scale-110 transition-all">
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}