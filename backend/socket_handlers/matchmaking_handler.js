const gameController = require('../controllers/game_controller');

class MatchmakingHandler {

  handleFindMatch(socket, io, { userId, betAmount, duration }) {
    console.log(`🎮 ${socket.id} searching for match: ${betAmount} tokens, ${duration}ms`);

    socket.userId = userId;
    socket.betAmount = betAmount;
    socket.duration = duration;

    const matchResult = gameController.findPublicMatch(socket, betAmount, duration);

    if (matchResult.found) {
      const opponent = matchResult.opponent;
      const roomId = gameController.generateRoomId();

      socket.join(roomId);
      opponent.join(roomId);

      gameController.createActiveRoom(
        roomId,
        socket.id,
        opponent.id,
        betAmount,
        duration
      );

      console.log(`✅ Match found! Room: ${roomId}`);
      io.to(roomId).emit('match-found', {
        roomId,
        pot: betAmount * 2,
        duration
      });
    } else {
      gameController.addToQueue(socket);
      socket.emit('waiting', 'Looking for an opponent...');
      console.log(`⏳ ${socket.id} added to waiting queue`);
    }
  }

  handleHostPrivate(socket, { userId, betAmount, duration }) {
    console.log(`🏠 ${socket.id} hosting private match: ${betAmount} tokens, ${duration}ms`);

    const passcode = gameController.generatePasscode();

    gameController.createPrivateRoom(
      passcode,
      socket,
      userId,
      betAmount,
      duration
    );

    socket.join(`room_${passcode}`);
    socket.emit('private-hosted', { passcode, betAmount, duration });

    console.log(`✅ Private room created with passcode: ${passcode}`);
  }

  handleJoinPrivate(socket, io, { userId, passcode }) {
    console.log(`🔑 ${socket.id} attempting to join private room: ${passcode}`);

    const room = gameController.getPrivateRoom(passcode);

    if (room) {
      const opponent = room.host;
      const roomId = `room_${passcode}`;
      socket.join(roomId);

      gameController.createActiveRoom(
        roomId,
        opponent.id,
        socket.id,
        room.betAmount,
        room.duration
      );

      gameController.deletePrivateRoom(passcode);

      console.log(`✅ Player joined private room: ${roomId}`);
      io.to(roomId).emit('match-found', {
        roomId,
        pot: room.betAmount * 2,
        duration: room.duration
      });
    } else {
      socket.emit('private-error', 'Invalid or expired passcode.');
      console.log(`❌ Invalid passcode attempt: ${passcode}`);
    }
  }
}

module.exports = new MatchmakingHandler();
