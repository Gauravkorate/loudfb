require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/payments', require('./routes/payments'));

let waitingQueue = [];
let activeRooms = {};
let privateRooms = {}; 

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // --- PUBLIC ARENA MATCHMAKING ---
  socket.on('find-match', ({ userId, betAmount, duration }) => {
    socket.userId = userId;
    socket.betAmount = betAmount;
    socket.duration = duration;

    // Strict matching: Must match both Bet Amount AND Duration
    const matchIndex = waitingQueue.findIndex(p => 
      p.betAmount === betAmount && p.duration === duration && p.id !== socket.id
    );

    if (matchIndex !== -1) {
      const opponent = waitingQueue.splice(matchIndex, 1)[0];
      const roomId = `room_${Date.now()}`;
      
      socket.join(roomId);
      opponent.join(roomId);

      activeRooms[roomId] = {
        players: [socket.id, opponent.id],
        betAmount: betAmount,
        duration: duration,
        pot: betAmount * 2,
        scores: {}
      };

      // Send the duration back to the clients so their timers sync
      io.to(roomId).emit('match-found', { roomId, pot: betAmount * 2, duration });
    } else {
      waitingQueue.push(socket);
      socket.emit('waiting', 'Looking for an opponent...');
    }
  });

  // --- PRIVATE MATCHMAKING (HOST & JOIN) ---
  socket.on('host-private', ({ userId, betAmount, duration }) => {
    const passcode = Math.floor(100000 + Math.random() * 900000).toString(); 
    
    privateRooms[passcode] = {
      host: socket,
      hostId: userId,
      betAmount: betAmount,
      duration: duration // Host dictates the time limit!
    };
    
    socket.join(`room_${passcode}`);
    socket.emit('private-hosted', { passcode, betAmount, duration });
  });

  socket.on('join-private', ({ userId, passcode }) => {
    const room = privateRooms[passcode];
    
    if (room) {
      const opponent = room.host;
      const roomId = `room_${passcode}`;
      socket.join(roomId);

      activeRooms[roomId] = {
        players: [opponent.id, socket.id],
        betAmount: room.betAmount,
        duration: room.duration,
        pot: room.betAmount * 2,
        scores: {}
      };

      delete privateRooms[passcode];
      io.to(roomId).emit('match-found', { roomId, pot: room.betAmount * 2, duration: room.duration });
    } else {
      socket.emit('private-error', 'Invalid or expired passcode.');
    }
  });

  // --- GAMEPLAY ENGINE ---
  socket.on('audio-ready', ({ roomId }) => {
    const room = activeRooms[roomId];
    if(!room) return;
    io.to(roomId).emit('start-countdown');
  });

  socket.on('submit-score', ({ roomId, score }) => {
    const room = activeRooms[roomId];
    if(!room) return;

    room.scores[socket.id] = score;

    if (Object.keys(room.scores).length === 2) {
      const p1 = room.players[0];
      const p2 = room.players[1];
      const p1Score = room.scores[p1];
      const p2Score = room.scores[p2];
      
      if (p1Score === p2Score) {
        io.to(roomId).emit('game-over', { result: 'tie', refund: room.betAmount });
      } else {
        const winner = p1Score > p2Score ? p1 : p2;
        const loser = p1Score > p2Score ? p2 : p1;
        io.to(winner).emit('game-over', { result: 'win', tokensWon: room.pot, myScore: room.scores[winner], oppScore: room.scores[loser] });
        io.to(loser).emit('game-over', { result: 'lose', myScore: room.scores[loser], oppScore: room.scores[winner] });
      }
      delete activeRooms[roomId];
    }
  });

  socket.on('disconnect', () => {
    waitingQueue = waitingQueue.filter(p => p.id !== socket.id);
    for (const code in privateRooms) {
      if (privateRooms[code].host.id === socket.id) delete privateRooms[code];
    }
  });
});

server.listen(3001, () => console.log('✅ Loudfb API & Engine running on port 3001'));