// src/services/queueNotifier.js
const queueService = require('./queueService');


/**
 * Starts periodic queue notifications.
 * @param {import("socket.io").Server} io
 */
function startQueueNotifier(io) {
    setInterval(async () => {
      const eventId = 'coldplay-mumbai-2025';
      const redis = await queueService.connectRedis();
      const queueKey = `queue:${eventId}`;
      
      const userIds = await redis.zRange(queueKey, 0, -1);
      for (const userId of userIds) {
        const position = await queueService.getQueuePosition(eventId, userId);
        const waitTime = queueService.calculateEstimatedWaitTime(position);
        const room = `queue:${eventId}:${userId}`;
        io.to(room).emit('position-update', {
          eventId,
          position,
          usersAhead: position - 1,
          estimatedWaitTime: waitTime
        });
      }
    }, 5000);
  }
  
  module.exports = { startQueueNotifier };