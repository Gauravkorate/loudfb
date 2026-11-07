require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');

// Import socket router
const socketRouter = require('./socket_handlers/socket_router');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: { origin: '*' } // TODO: Restrict in production
});

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Loudfb Arena API'
  });
});

// Initialize Socket.IO handlers
socketRouter.initializeSocket(io);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 Loudfb Arena Server Started');
  console.log('='.repeat(50));
  console.log(`📡 API Server: http://localhost:${PORT}`);
  console.log(`🎮 Socket.IO: Ready for connections`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log('='.repeat(50));
});

module.exports = { app, server, io };
