// src/routes/booking.js
const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');
const { authenticate } = require('../middleware/auth');

// Create a booking session
router.post('/create', authenticate, async (req, res) => {
  try {
    const { eventId, seatIds, durationMinutes = 10 } = req.body;
    const userId = req.user.id;

    if (!eventId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Event ID and seat IDs are required',
          code: 'INVALID_INPUT'
        }
      });
    }

    const result = await bookingService.createBooking(userId, eventId, seatIds, durationMinutes);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Booking session created successfully',
        data: result.booking
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          message: result.error,
          code: 'BOOKING_CREATION_FAILED'
        }
      });
    }

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create booking',
        code: 'BOOKING_ERROR'
      }
    });
  }
});

// Get booking details
router.get('/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const result = await bookingService.getBooking(bookingId, userId);

    if (result.success) {
      res.json({
        success: true,
        data: result.booking
      });
    } else {
      res.status(404).json({
        success: false,
        error: {
          message: result.error,
          code: 'BOOKING_NOT_FOUND'
        }
      });
    }

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch booking',
        code: 'BOOKING_ERROR'
      }
    });
  }
});

// Confirm booking (simulate payment)
router.post('/:bookingId/confirm', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { paymentId = `payment_${Date.now()}` } = req.body; // Simulate payment ID

    const result = await bookingService.confirmBooking(bookingId, paymentId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          bookingId,
          paymentId,
          status: 'confirmed'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          message: result.error,
          code: 'BOOKING_CONFIRMATION_FAILED'
        }
      });
    }

  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to confirm booking',
        code: 'BOOKING_ERROR'
      }
    });
  }
});

// Cancel booking
router.post('/:bookingId/cancel', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const result = await bookingService.cancelBooking(bookingId, userId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          message: result.error,
          code: 'BOOKING_CANCELLATION_FAILED'
        }
      });
    }

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to cancel booking',
        code: 'BOOKING_ERROR'
      }
    });
  }
});

module.exports = router;
