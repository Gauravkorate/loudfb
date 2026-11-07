const gameController = require('../controllers/game_controller');

class GameplayHandler {

  handleAudioReady(socket, io, { roomId }) {
    const room = gameController.getActiveRooms()[roomId];
    if (!room) {
      console.log(`❌ Audio ready for non-existent room: ${roomId}`);
      return;
    }

    console.log(`🎵 Audio ready in room: ${roomId}`);
    io.to(roomId).emit('start-countdown');
  }

  handleSubmitScore(socket, io, { roomId, score }) {
    const room = gameController.getActiveRooms()[roomId];
    if (!room) {
      console.log(`❌ Score submitted for non-existent room: ${roomId}`);
      return;
    }

    console.log(`📊 Score submitted in ${roomId}: ${socket.id} = ${score}`);

    const result = gameController.submitScore(roomId, socket.id, score);

    if (result) {
      console.log(`🏁 Game over in ${roomId}:`, result.type);

      if (result.type === 'tie') {
        io.to(roomId).emit('game-over', {
          result: 'tie',
          refund: result.refund
        });
      } else {
        io.to(result.winner).emit('game-over', {
          result: 'win',
          tokensWon: result.pot,
          myScore: result.scores.winner,
          oppScore: result.scores.loser
        });

        io.to(result.loser).emit('game-over', {
          result: 'lose',
          myScore: result.scores.loser,
          oppScore: result.scores.winner
        });
      }

      gameController.deleteActiveRoom(roomId);
    }
  }
}

module.exports = new GameplayHandler();
