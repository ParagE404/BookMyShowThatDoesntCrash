// src/routes/payment.js
const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const bookingService = require('../services/bookingService');
const { authenticate } = require('../middleware/auth');

// Create payment intent for a booking
router.post('/create-intent', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.id;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Booking ID is required',
          code: 'MISSING_BOOKING_ID'
        }
      });
    }

    // Get booking details
    const bookingResult = await bookingService.getBooking(bookingId, userId);
    
    if (!bookingResult.success) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Booking not found or expired',
          code: 'BOOKING_NOT_FOUND'
        }
      });
    }

    const booking = bookingResult.booking;

    if (booking.isExpired) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Booking has expired',
          code: 'BOOKING_EXPIRED'
        }
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Booking is not in pending status',
          code: 'INVALID_BOOKING_STATUS'
        }
      });
    }

    // Create payment intent
    const paymentResult = await paymentService.createPaymentIntent(
      bookingId, 
      parseFloat(booking.total_amount)
    );

    if (paymentResult.success) {
      res.json({
        success: true,
        data: {
          clientSecret: paymentResult.paymentIntent.client_secret,
          paymentIntentId: paymentResult.paymentIntent.id,
          amount: paymentResult.paymentIntent.amount,
          currency: paymentResult.paymentIntent.currency
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          message: paymentResult.error,
          code: 'PAYMENT_INTENT_FAILED'
        }
      });
    }

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create payment intent',
        code: 'PAYMENT_ERROR'
      }
    });
  }
});

// Simulate payment confirmation (for testing)
router.post('/simulate-payment', authenticate, async (req, res) => {
  try {
    const { paymentIntentId, bookingId, success = true } = req.body;

    if (!paymentIntentId || !bookingId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Payment intent ID and booking ID are required',
          code: 'MISSING_REQUIRED_FIELDS'
        }
      });
    }

    if (success) {
      // Simulate successful payment
      const result = await paymentService.processSuccessfulPayment(paymentIntentId, bookingId);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: {
            bookingId: result.bookingId,
            paymentId: result.paymentId,
            status: 'confirmed'
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            message: result.error,
            code: 'PAYMENT_PROCESSING_FAILED'
          }
        });
      }
    } else {
      // Simulate payment failure
      const result = await paymentService.handlePaymentFailure(
        paymentIntentId, 
        bookingId, 
        'Simulated payment failure'
      );
      
      res.json({
        success: false,
        message: 'Payment failed (simulated)',
        data: {
          bookingId,
          status: 'cancelled'
        }
      });
    }

  } catch (error) {
    console.error('Simulate payment error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to simulate payment',
        code: 'SIMULATION_ERROR'
      }
    });
  }
});

module.exports = router;
