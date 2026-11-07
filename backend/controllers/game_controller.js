class GameController {
  constructor() {
    this.waitingQueue = [];
    this.activeRooms = {};
    this.privateRooms = {};
  }

  getActiveRooms() {
    return this.activeRooms;
  }

  getWaitingQueue() {
    return this.waitingQueue;
  }

  addToQueue(socket) {
    this.waitingQueue.push(socket);
  }

  removeFromQueue(socketId) {
    this.waitingQueue = this.waitingQueue.filter(p => p.id !== socketId);
  }

  findPublicMatch(socket, betAmount, duration) {
    const matchIndex = this.waitingQueue.findIndex(p =>
      p.betAmount === betAmount &&
      p.duration === duration &&
      p.id !== socket.id
    );

    if (matchIndex !== -1) {
      const opponent = this.waitingQueue.splice(matchIndex, 1)[0];
      return { found: true, opponent };
    }

    return { found: false };
  }

  createActiveRoom(roomId, player1Id, player2Id, betAmount, duration) {
    this.activeRooms[roomId] = {
      players: [player1Id, player2Id],
      betAmount: betAmount,
      duration: duration,
      pot: betAmount * 2,
      scores: {}
    };
    return this.activeRooms[roomId];
  }

  createPrivateRoom(passcode, host, hostId, betAmount, duration) {
    this.privateRooms[passcode] = {
      host: host,
      hostId: hostId,
      betAmount: betAmount,
      duration: duration
    };
  }

  getPrivateRoom(passcode) {
    return this.privateRooms[passcode];
  }

  deletePrivateRoom(passcode) {
    delete this.privateRooms[passcode];
  }

  submitScore(roomId, socketId, score) {
    const room = this.activeRooms[roomId];
    if (!room) return null;

    room.scores[socketId] = score;

    if (Object.keys(room.scores).length === 2) {
      const p1 = room.players[0];
      const p2 = room.players[1];
      const p1Score = room.scores[p1];
      const p2Score = room.scores[p2];

      let result;
      if (p1Score === p2Score) {
        result = {
          type: 'tie',
          refund: room.betAmount
        };
      } else {
        const winner = p1Score > p2Score ? p1 : p2;
        const loser = p1Score > p2Score ? p2 : p1;
        result = {
          type: 'win',
          winner: winner,
          loser: loser,
          pot: room.pot,
          scores: {
            winner: room.scores[winner],
            loser: room.scores[loser]
          }
        };
      }

      return result;
    }

    return null;
  }

  deleteActiveRoom(roomId) {
    delete this.activeRooms[roomId];
  }

  cleanupPlayer(socketId) {
    this.removeFromQueue(socketId);

    for (const code in this.privateRooms) {
      if (this.privateRooms[code].host.id === socketId) {
        delete this.privateRooms[code];
      }
    }
  }

  generatePasscode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  generateRoomId() {
    return `room_${Date.now()}`;
  }
}

module.exports = new GameController();
