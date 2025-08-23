// src/routes/queue.js
// Queue management endpoints

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { queueLimiter } = require('../middleware/rateLimit');
const queueService = require('../services/queueService');

const router = express.Router();

// Apply authentication and rate limiting to all queue routes
router.use(authenticate);
router.use(queueLimiter); // 5 queue operations per 5 minutes per user

/**
 * POST /api/queue/join
 * Join the virtual queue for an event
 */
router.post('/join', async (req, res) => {
  try {
    const { eventId } = req.body;
    const userId = req.user.id;

    if (!eventId) {
      return res.status(400).json({
        error: {
          message: 'Event ID is required',
          code: 'MISSING_EVENT_ID'
        }
      });
    }

    const userInfo = {
      email: req.user.email,
      role: req.user.role
    };

    const result = await queueService.joinQueue(eventId, userId, userInfo);

    if (!result.success) {
      return res.status(409).json({
        error: {
          message: result.message,
          code: result.error,
          position: result.position
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Successfully joined queue',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Join queue error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to join queue',
        code: 'QUEUE_JOIN_ERROR'
      }
    });
  }
});

/**
 * GET /api/queue/position/:eventId
 * Get current position in queue
 */
router.get('/position/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const position = await queueService.getQueuePosition(eventId, userId);

    if (position === null) {
      return res.status(404).json({
        error: {
          message: 'You are not in this queue',
          code: 'NOT_IN_QUEUE'
        }
      });
    }

    const stats = await queueService.getQueueStats(eventId);
    const waitTime = queueService.calculateEstimatedWaitTime(position);

    res.json({
      success: true,
      data: {
        eventId,
        position,
        queueSize: stats.queueSize,
        estimatedWaitTime: waitTime,
        usersAhead: position - 1
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get position error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get queue position',
        code: 'QUEUE_POSITION_ERROR'
      }
    });
  }
});

/**
 * DELETE /api/queue/leave/:eventId
 * Leave the queue
 */
router.delete('/leave/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const result = await queueService.leaveQueue(eventId, userId);

    res.json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Leave queue error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to leave queue',
        code: 'QUEUE_LEAVE_ERROR'
      }
    });
  }
});

/**
 * GET /api/queue/stats/:eventId
 * Get queue statistics (admin/debug)
 */
router.get('/stats/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const stats = await queueService.getQueueStats(eventId);

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Queue stats error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get queue statistics',
        code: 'QUEUE_STATS_ERROR'
      }
    });
  }
});

module.exports = router;
