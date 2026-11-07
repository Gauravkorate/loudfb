const matchmakingHandler = require('./matchmaking_handler');
const gameplayHandler = require('./gameplay_handler');
const gameController = require('../controllers/game_controller');

class SocketRouter {

  initializeSocket(io) {
    io.on('connection', (socket) => {
      console.log(`✅ User connected: ${socket.id}`);

      socket.on('find-match', (data) => {
        matchmakingHandler.handleFindMatch(socket, io, data);
      });

      socket.on('host-private', (data) => {
        matchmakingHandler.handleHostPrivate(socket, data);
      });

      socket.on('join-private', (data) => {
        matchmakingHandler.handleJoinPrivate(socket, io, data);
      });

      socket.on('audio-ready', (data) => {
        gameplayHandler.handleAudioReady(socket, io, data);
      });

      socket.on('submit-score', (data) => {
        gameplayHandler.handleSubmitScore(socket, io, data);
      });

      socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
        gameController.cleanupPlayer(socket.id);
      });
    });
  }
}

module.exports = new SocketRouter();
