const validateSocketData = (requiredFields) => {
  return (socket, data, next) => {
    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
      console.log(`❌ Validation failed for ${socket.id}: Missing ${missingFields.join(', ')}`);
      socket.emit('error', {
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
      return;
    }

    next();
  };
};

const logSocketEvent = (eventName) => {
  return (socket, data) => {
    console.log(`📡 [${eventName}] Socket: ${socket.id}, Data:`, JSON.stringify(data));
  };
};

module.exports = {
  validateSocketData,
  logSocketEvent
};
