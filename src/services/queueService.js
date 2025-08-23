// src/services/queueService.js
// Virtual Queue System - Handles millions of users fairly

const { createClient } = require("redis");

class VirtualQueueService {
  constructor() {
    this.redisClient = null;
    this.connectRedis();
  }

  async connectRedis() {
    if (!this.redisClient) {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || "redis://localhost:6379",
      });

      this.redisClient.on("error", (err) => {
        console.error("❌ Queue Redis Error:", err);
      });

      this.redisClient.on("connect", () => {
        console.log("✅ Queue service connected to Redis");
      });

      await this.redisClient.connect();
    }
    return this.redisClient;
  }

  // ===== CORE QUEUE OPERATIONS =====

  /**
   * Add user to virtual queue
   * @param {string} eventId - Event identifier (e.g., 'coldplay-mumbai-2025')
   * @param {string} userId - User identifier
   * @param {Object} userInfo - User metadata for better UX
   */
  async joinQueue(eventId, userId, userInfo = {}) {
    try {
      const redis = await this.connectRedis();
      const queueKey = `queue:${eventId}`;
      const userKey = `queue_user:${eventId}:${userId}`;
      const timestamp = Date.now();

      // Use pipeline for atomic operations
      const pipeline = redis.multi();

      // Check if user is already in queue
      const existingPosition = await redis.zRank(queueKey, userId);
      if (existingPosition !== null) {
        return {
          success: false,
          error: "ALREADY_IN_QUEUE",
          message: "You are already in the queue",
          position: existingPosition + 1, // Redis is 0-indexed, we want 1-indexed
        };
      }

      // Add user to sorted set with timestamp as score
      pipeline.zAdd(queueKey, {
        score: timestamp,
        value: userId,
      });

      // Store user metadata for better UX
      pipeline.hSet(userKey, {
        userId,
        joinedAt: timestamp,
        ...userInfo,
      });

      // Set expiration for user data (24 hours)
      pipeline.expire(userKey, 24 * 60 * 60);

      await pipeline.exec();

      // Get user's position in queue
      const position = await this.getQueuePosition(eventId, userId);
      const queueSize = await redis.zCard(queueKey);

      console.log(
        `✅ User ${userId} joined queue for ${eventId} at position ${position}`
      );

      return {
        success: true,
        queueId: `${eventId}:${userId}`,
        position,
        queueSize,
        estimatedWaitTime: this.calculateEstimatedWaitTime(position),
        joinedAt: timestamp,
      };
    } catch (error) {
      console.error("Queue join error:", error);
      throw new Error("Failed to join queue");
    }
  }

  /**
   * Get user's current position in queue
   * @param {string} eventId - Event identifier
   * @param {string} userId - User identifier
   */
  async getQueuePosition(eventId, userId) {
    try {
      const redis = await this.connectRedis();
      const queueKey = `queue:${eventId}`;

      const rank = await redis.zRank(queueKey, userId);
      return rank !== null ? rank + 1 : null; // Convert to 1-indexed
    } catch (error) {
      console.error("Get position error:", error);
      return null;
    }
  }

  /**
   * Remove user from queue
   * @param {string} eventId - Event identifier
   * @param {string} userId - User identifier
   */
  async leaveQueue(eventId, userId) {
    try {
      const redis = await this.connectRedis();
      const queueKey = `queue:${eventId}`;
      const userKey = `queue_user:${eventId}:${userId}`;

      const pipeline = redis.multi();
      pipeline.zRem(queueKey, userId);
      pipeline.del(userKey);

      const results = await pipeline.exec();
      const removed = results[0][1]; // Number of elements removed

      console.log(`🚪 User ${userId} left queue for ${eventId}`);

      return {
        success: removed > 0,
        message:
          removed > 0 ? "Successfully left queue" : "User was not in queue",
      };
    } catch (error) {
      console.error("Leave queue error:", error);
      throw new Error("Failed to leave queue");
    }
  }

  /**
   * Get queue statistics
   * @param {string} eventId - Event identifier
   */
  async getQueueStats(eventId) {
    const redis = await this.connectRedis();
    const queueKey = `queue:${eventId}`;
  
    // Total queue size
    const queueSize = await redis.zCard(queueKey);
  
    // Safely get oldest and newest entries with scores
    const oldest = await redis.zRangeWithScores(queueKey, 0, 0);
    const newest = await redis.zRangeWithScores(queueKey, -1, -1);
  
    const oldestTimestamp = oldest[0]?.score || null;
    const newestTimestamp = newest?.score || null;
  
    return {
      eventId,
      queueSize,
      oldestUser: oldest?.value || null,
      oldestTimestamp,
      newestUser: newest?.value || null,
      newestTimestamp,
      averageWaitTime: this.calculateEstimatedWaitTime(Math.ceil(queueSize / 2))
    };
  }
  

  /**
   * Calculate estimated wait time based on queue position
   * @param {number} position - Position in queue
   */
  calculateEstimatedWaitTime(position) {
    if (!position || position <= 0) return 0;

    // Assume we process 50 users every 30 seconds
    const usersPerBatch = 50;
    const batchIntervalMs = 30 * 1000; // 30 seconds

    const batchesAhead = Math.ceil(position / usersPerBatch);
    const estimatedMs = batchesAhead * batchIntervalMs;

    return {
      milliseconds: estimatedMs,
      seconds: Math.ceil(estimatedMs / 1000),
      minutes: Math.ceil(estimatedMs / (1000 * 60)),
      humanReadable: this.formatWaitTime(estimatedMs),
    };
  }

  /**
   * Format wait time in human-readable format
   * @param {number} ms - Milliseconds
   */
  formatWaitTime(ms) {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
}

// Singleton instance
const queueService = new VirtualQueueService();

module.exports = queueService;
