// src/services/paymentService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_simulated');
const bookingService = require('./bookingService');

class PaymentService {
  constructor() {
    this.isTestMode = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('simulated');
    if (this.isTestMode) {
      console.log('💳 Payment service running in TEST mode (simulated payments)');
    }
  }

  // Create payment intent
  async createPaymentIntent(bookingId, amount, currency = 'inr') {
    try {
      if (this.isTestMode) {
        // Simulate Stripe payment intent for demo
        return {
          success: true,
          paymentIntent: {
            id: `pi_test_${Date.now()}`,
            amount: amount * 100, // Stripe uses cents
            currency,
            status: 'requires_payment_method',
            client_secret: `pi_test_${Date.now()}_secret_test123`
          }
        };
      }

      // Real Stripe integration
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Convert to cents
        currency,
        metadata: {
          bookingId,
          type: 'ticket_booking'
        }
      });

      return {
        success: true,
        paymentIntent
      };

    } catch (error) {
      console.error('Payment intent creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Simulate payment confirmation
  async confirmPayment(paymentIntentId, paymentMethodId = null) {
    try {
      if (this.isTestMode) {
        // Simulate successful payment
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
        
        return {
          success: true,
          paymentIntent: {
            id: paymentIntentId,
            status: 'succeeded',
            charges: {
              data: [{
                id: `ch_test_${Date.now()}`,
                paid: true,
                amount: 500000, // ₹5000 in paisa
                currency: 'inr'
              }]
            }
          }
        };
      }

      // Real Stripe confirmation
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId
      });

      return {
        success: true,
        paymentIntent
      };

    } catch (error) {
      console.error('Payment confirmation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process successful payment
  async processSuccessfulPayment(paymentIntentId, bookingId) {
    try {
      // Confirm the booking
      const result = await bookingService.confirmBooking(bookingId, paymentIntentId);
      
      if (result.success) {
        console.log(`💳 Payment processed successfully for booking ${bookingId}`);
        
        // Here you could add:
        // - Send confirmation email
        // - Generate ticket PDF
        // - Update analytics
        // - Send to CRM system
        
        return {
          success: true,
          message: 'Payment processed and booking confirmed',
          bookingId,
          paymentId: paymentIntentId
        };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Payment processing error:', error);
      
      // Handle payment succeeded but booking failed
      // In production, you'd need to refund the payment
      
      return {
        success: false,
        error: 'Payment succeeded but booking confirmation failed. Please contact support.',
        requiresRefund: true
      };
    }
  }

  // Handle payment failures
  async handlePaymentFailure(paymentIntentId, bookingId, reason) {
    try {
      console.log(`❌ Payment failed for booking ${bookingId}: ${reason}`);
      
      // Cancel the booking and release seats
      await bookingService.cancelBooking(bookingId, null); // No user check for system cancellation
      
      return {
        success: true,
        message: 'Booking cancelled due to payment failure, seats released'
      };

    } catch (error) {
      console.error('Payment failure handling error:', error);
      return {
        success: false,
        error: 'Failed to handle payment failure'
      };
    }
  }
}

module.exports = new PaymentService();
