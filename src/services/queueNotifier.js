// src/services/queueNotifier.js
const queueService = require("./queueService");

/**
 * Starts periodic queue notifications.
 * @param {import("socket.io").Server} io
 */
async function startQueueNotifier(io) {
  const eventId = "coldplay-mumbai-2025";

  setInterval(async () => {
    // Advance queue every 30 seconds
    const usersAdvanced = await queueService.processQueueBatch(eventId, 1);

    // Notify advanced users (those moved out of queue to booking)
    for (const userId of usersAdvanced) {
      const room = `queue:${eventId}:${userId}`;
      io.to(room).emit("queue-advanced", {
        eventId,
        userId,
        timestamp: Date.now(),
      });
    }
  }, 30 * 1000);

  // Send position updates every 5 seconds
  setInterval(async () => {
    const redis = await queueService.connectRedis();
    const queueKey = `queue:${eventId}`;
    const userIds = await redis.zRange(queueKey, 0, -1);
    // console.log(
    //   `Sending position updates to ${userIds.length} users in room queue:${eventId} at ${new Date().toISOString()}`,
    // );

    for (const userId of userIds) {
      const position = await queueService.getQueuePosition(eventId, userId);
      const waitTime = queueService.calculateEstimatedWaitTime(position);
      const room = `queue:${eventId}:${userId}`;
      console.log(
        `Sending position update to ${userId} in room ${room} at ${new Date().toISOString()}`,
      );
      io.to(room).emit("position-update", {
        eventId,
        position,
        usersAhead: position - 1,
        estimatedWaitTime: waitTime,
      });
    }
  }, 5 * 1000); // every 5 seconds
}

module.exports = { startQueueNotifier };