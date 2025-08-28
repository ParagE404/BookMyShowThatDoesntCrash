// src/routes/inventory.js
const express = require('express');
const router = express.Router();
const inventoryService = require('../services/inventoryService');
const { authenticate } = require('../middleware/auth');
const dbManager = require('../models/database'); // Add this line

// Get available seats for an event
router.get('/events/:eventId/seats', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { category, limit = 100 } = req.query;

    const seats = await inventoryService.getAllSeats(
      eventId, 
      category, 
      parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        eventId,
        category: category || 'all',
        seats: Array.isArray(seats) ? seats : [],
        count: seats.length || 0
      }
    });

  } catch (error) {
    console.error('Get seats error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch seats',
        code: 'FETCH_SEATS_ERROR'
      }
    });
  }
});


// Get inventory summary
router.get('/events/:eventId/summary', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const summary = inventoryService.getInventorySummary(eventId);

    res.json({
      success: true,
      data: {
        eventId,
        categories: summary
      }
    });

  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch inventory summary',
        code: 'INVENTORY_ERROR'
      }
    });
  }
});

// Lock seats for booking (reserve seats)
router.post('/seats/lock', authenticate, async (req, res) => {
  try {
    const { seatIds, durationMinutes = 10 } = req.body;
    const userId = req.user.id;

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Seat IDs are required',
          code: 'INVALID_SEAT_IDS'
        }
      });
    }

    if (seatIds.length > 10) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot lock more than 10 seats at once',
          code: 'TOO_MANY_SEATS'
        }
      });
    }

    const result = await inventoryService.lockSeats(userId, seatIds, durationMinutes);

    if (result.success && result.lockedSeats.length > 0) {
      res.status(200).json({
        success: true,
        message: 'Seats locked successfully',
        data: {
          lockedSeats: result.lockedSeats,
          expiresAt: result.expiresAt,
          lockDurationMinutes: result.lockDurationMinutes
        }
      });
    } else {
      res.status(409).json({
        success: false,
        error: {
          message: 'Some or all seats could not be locked (may be already taken)',
          code: 'SEAT_LOCK_FAILED'
        },
        data: {
          lockedSeats: result.lockedSeats
        }
      });
    }

  } catch (error) {
    console.error('Lock seats error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to lock seats',
        code: 'LOCK_SEATS_ERROR'
      }
    });
  }
});

// Release locked seats
router.post('/seats/release', authenticate, async (req, res) => {
  try {
    const { seatIds } = req.body;
    const userId = req.user.id;

    const result = await inventoryService.releaseSeatLocks(userId, seatIds);

    if (result.success) {
      res.json({
        success: true,
        message: 'Seats released successfully',
        data: {
          releasedCount: result.releasedCount
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          message: result.error || 'Failed to release seats',
          code: 'RELEASE_SEATS_ERROR'
        }
      });
    }

  } catch (error) {
    console.error('Release seats error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to release seats',
        code: 'RELEASE_SEATS_ERROR'
      }
    });
  }
});

// Debug endpoint to check database content
router.get('/debug/:eventId', authenticate, async (req, res) => {
    try {
      const { eventId } = req.params;
  
      // Check events
      const events = await dbManager.query('SELECT * FROM events WHERE id = $1', [eventId]);
      
      // Check categories  
      const categories = await dbManager.query('SELECT * FROM seat_categories WHERE event_id = $1', [eventId]);
      
      // Check seats count
      const seatsCount = await dbManager.query(`
        SELECT category_id, status, COUNT(*) as count 
        FROM seats WHERE event_id = $1 
        GROUP BY category_id, status
      `, [eventId]);
  
      // Check total seats
      const totalSeats = await dbManager.query('SELECT COUNT(*) as total FROM seats WHERE event_id = $1', [eventId]);
  
      res.json({
        success: true,
        debug: {
          eventId,
          events: events.rows,
          categories: categories.rows,
          seatsCount: seatsCount.rows,
          totalSeats: totalSeats.rows[0]?.total || 0
        }
      });
  
    } catch (error) {
      console.error('Debug error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
module.exports = router;
