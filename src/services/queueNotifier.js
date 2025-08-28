// src/services/queueNotifier.js
const queueService = require("./queueService");
const dbManager = require("../models/database");

/**
 * Starts periodic queue notifications for ALL active events.
 * @param {import("socket.io").Server} io
 */
async function startQueueNotifier(io) {
  
  // Function to get all active events
  async function getActiveEvents() {
    try {
      const result = await dbManager.query(`
        SELECT id, name FROM events 
        WHERE event_date > NOW() 
        ORDER BY event_date ASC
      `);
      return result.rows;
    } catch (error) {
      console.error('Error fetching active events:', error);
      return [];
    }
  }

  // Function to check if event has users in queue
  async function hasUsersInQueue(eventId) {
    try {
      const redis = await queueService.connectRedis();
      const queueKey = `queue:${eventId}`;
      const queueSize = await redis.zCard(queueKey);
      return queueSize > 0;
    } catch (error) {
      console.error(`Error checking queue size for ${eventId}:`, error);
      return false;
    }
  }

  // ADVANCE USERS: Process queue batches every 30 seconds for all events
  setInterval(async () => {
    try {
      const activeEvents = await getActiveEvents();
      console.log(`🔄 Processing queues for ${activeEvents.length} active events`);

      for (const event of activeEvents) {
        const eventId = event.id;
        
        // Only process if there are users in queue
        const hasUsers = await hasUsersInQueue(eventId);
        if (!hasUsers) {
          continue; // Skip empty queues
        }

        console.log(`⚡ Processing queue batch for event: ${eventId}`);
        
        // Advance users for this event (configurable batch size per event)
        const batchSize = getBatchSizeForEvent(eventId);
        const usersAdvanced = await queueService.processQueueBatch(eventId, batchSize);

        // Notify advanced users (those moved out of queue to booking)
        for (const userId of usersAdvanced) {
          const room = `queue:${eventId}:${userId}`;
          io.to(room).emit("queue-advanced", {
            eventId,
            userId,
            eventName: event.name,
            timestamp: Date.now(),
          });
          
          console.log(`🎉 Advanced user ${userId} for event ${eventId}`);
        }

        if (usersAdvanced.length > 0) {
          console.log(`✅ Advanced ${usersAdvanced.length} users for ${eventId}`);
        }
      }
    } catch (error) {
      console.error('Error in queue advancement process:', error);
    }
  }, 30 * 1000); // Every 30 seconds

  // POSITION UPDATES: Send position updates every 5 seconds for all events
  setInterval(async () => {
    try {
      const activeEvents = await getActiveEvents();
      
      for (const event of activeEvents) {
        const eventId = event.id;
        
        // Only send updates if there are users in queue
        const hasUsers = await hasUsersInQueue(eventId);
        if (!hasUsers) {
          continue; // Skip empty queues
        }

        const redis = await queueService.connectRedis();
        const queueKey = `queue:${eventId}`;
        const userIds = await redis.zRange(queueKey, 0, -1);
        
        console.log(`📊 Sending position updates to ${userIds.length} users for event ${eventId}`);

        for (const userId of userIds) {
          const position = await queueService.getQueuePosition(eventId, userId);
          const waitTime = queueService.calculateEstimatedWaitTime(position);
          const room = `queue:${eventId}:${userId}`;
          
          io.to(room).emit("position-update", {
            eventId,
            eventName: event.name,
            position,
            usersAhead: position - 1,
            estimatedWaitTime: waitTime,
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      console.error('Error in position update process:', error);
    }
  }, 5 * 1000); // Every 5 seconds

  console.log('🚀 Multi-event queue notifier started');
}

// Helper function to get batch size per event (can be configured)
function getBatchSizeForEvent(eventId) {
  // You can customize batch sizes per event
  const eventBatchSizes = {
    'coldplay-mumbai-2025': 1,      // Advance 2 users every 30 seconds
    'taylor-mumbai-2025': 1,        // Advance 3 users every 30 seconds
    'ar-rahman-delhi-2025': 1,      // Advance 1 user every 30 seconds
  };
  
  return eventBatchSizes[eventId] || 1; // Default: 1 user per batch
}

module.exports = { startQueueNotifier };
