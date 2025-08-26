// src/services/bookingService.js
const dbManager = require('../models/database');
const inventoryService = require('./inventoryService');
const { v4: uuidv4 } = require('uuid');

class BookingService {
  constructor() {
    this.redis = null;
    this.connectRedis();
  }

  async connectRedis() {
    if (!this.redis) {
      const { createClient } = require('redis');
      this.redis = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      await this.redis.connect();
      console.log('✅ Booking service connected to Redis');
    }
    return this.redis;
  }

  // Create a new booking session
  async createBooking(userId, eventId, seatIds, durationMinutes = 10) {
    const client = await dbManager.pool.connect();
    
    try {
      await client.query('BEGIN');

      // First, get seat details and verify they're available/locked by this user
      const seatQuery = `
        SELECT s.*, sc.price, sc.category_name
        FROM seats s
        JOIN seat_categories sc ON s.category_id = sc.id
        WHERE s.id = ANY($1) AND s.event_id = $2
      `;
      const seatsResult = await client.query(seatQuery, [seatIds, eventId]);
      
      if (seatsResult.rows.length !== seatIds.length) {
        throw new Error('Some seats not found');
      }

      // Verify seats are available or locked by this user
      const invalidSeats = seatsResult.rows.filter(seat => 
        seat.status !== 'available' && 
        (seat.status !== 'locked' || seat.locked_by_user !== userId)
      );

      if (invalidSeats.length > 0) {
        throw new Error('Some seats are not available or not locked by you');
      }

      // Calculate total amount
      const totalAmount = seatsResult.rows.reduce((sum, seat) => sum + parseFloat(seat.price), 0);

      // Create booking record
      const bookingId = uuidv4();
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

      const bookingResult = await client.query(`
        INSERT INTO bookings (id, user_id, event_id, total_amount, booking_expires_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [bookingId, userId, eventId, totalAmount, expiresAt]);

      // Create booking items
      for (const seat of seatsResult.rows) {
        await client.query(`
          INSERT INTO booking_items (booking_id, seat_id, category_id, price)
          VALUES ($1, $2, $3, $4)
        `, [bookingId, seat.id, seat.category_id, seat.price]);
      }

      // Lock the seats (update existing locks or create new ones)
      for (const seatId of seatIds) {
        await client.query(`
          UPDATE seats 
          SET status = 'locked',
              locked_until = $1,
              locked_by_user = $2
          WHERE id = $3
        `, [expiresAt, userId, seatId]);
      }

      await client.query('COMMIT');

      // Set Redis session
      const redis = await this.connectRedis();
      const sessionData = {
        bookingId,
        userId,
        eventId,
        seatIds,
        totalAmount,
        expiresAt: expiresAt.toISOString(),
        status: 'pending'
      };

      await redis.setEx(
        `booking_session:${bookingId}`, 
        durationMinutes * 60, 
        JSON.stringify(sessionData)
      );

      console.log(`📝 Created booking ${bookingId} for user ${userId}, expires: ${expiresAt.toISOString()}`);

      return {
        success: true,
        booking: {
          ...bookingResult.rows[0],
          seats: seatsResult.rows,
          sessionData
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Booking creation error:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      client.release();
    }
  }

  // Get booking details
  async getBooking(bookingId, userId = null) {
    try {
      let query = `
        SELECT b.*, 
               json_agg(
                 json_build_object(
                   'seat_id', bi.seat_id,
                   'category_id', bi.category_id,
                   'price', bi.price,
                   'seat_details', json_build_object(
                     'seat_number', s.seat_number,
                     'section', s.section,
                     'row_number', s.row_number,
                     'category_name', sc.category_name
                   )
                 )
               ) as seats
        FROM bookings b
        JOIN booking_items bi ON b.id = bi.booking_id
        JOIN seats s ON bi.seat_id = s.id
        JOIN seat_categories sc ON bi.category_id = sc.id
        WHERE b.id = $1
      `;
      
      const params = [bookingId];
      
      if (userId) {
        query += ' AND b.user_id = $2';
        params.push(userId);
      }
      
      query += ' GROUP BY b.id';

      const result = await dbManager.query(query, params);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Booking not found' };
      }

      const booking = result.rows[0];
      
      // Check if booking is expired
      const now = new Date();
      const expiresAt = new Date(booking.booking_expires_at);
      const isExpired = now > expiresAt;

      return {
        success: true,
        booking: {
          ...booking,
          isExpired,
          timeRemaining: isExpired ? 0 : Math.max(0, expiresAt - now)
        }
      };

    } catch (error) {
      console.error('Get booking error:', error);
      return {
        success: false,
        error: 'Failed to fetch booking'
      };
    }
  }

  // Confirm booking (after payment)
  async confirmBooking(bookingId, paymentId) {
    const client = await dbManager.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get booking details
      const bookingResult = await client.query(
        'SELECT * FROM bookings WHERE id = $1 AND status = $2',
        [bookingId, 'pending']
      );

      if (bookingResult.rows.length === 0) {
        throw new Error('Booking not found or already processed');
      }

      const booking = bookingResult.rows[0];
      
      // Check if not expired
      if (new Date() > new Date(booking.booking_expires_at)) {
        throw new Error('Booking has expired');
      }

      // Update booking status
      await client.query(`
        UPDATE bookings 
        SET status = 'confirmed',
            payment_status = 'completed',
            payment_id = $1,
            confirmed_at = NOW()
        WHERE id = $2
      `, [paymentId, bookingId]);

      // Mark seats as sold
      await client.query(`
        UPDATE seats 
        SET status = 'sold',
            locked_until = NULL,
            locked_by_user = NULL
        WHERE id IN (
          SELECT seat_id FROM booking_items WHERE booking_id = $1
        )
      `, [bookingId]);

      await client.query('COMMIT');

      // Remove Redis session
      const redis = await this.connectRedis();
      await redis.del(`booking_session:${bookingId}`);

      console.log(`✅ Confirmed booking ${bookingId} with payment ${paymentId}`);

      return {
        success: true,
        message: 'Booking confirmed successfully'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Booking confirmation error:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      client.release();
    }
  }

  // Cancel booking and release seats
  async cancelBooking(bookingId, userId) {
    const client = await dbManager.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update booking status
      const result = await client.query(`
        UPDATE bookings 
        SET status = 'cancelled'
        WHERE id = $1 AND user_id = $2 AND status = 'pending'
      `, [bookingId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Booking not found or cannot be cancelled');
      }

      // Get seat IDs
      const seatsResult = await client.query(
        'SELECT seat_id FROM booking_items WHERE booking_id = $1',
        [bookingId]
      );
      
      const seatIds = seatsResult.rows.map(row => row.seat_id);

      // Release seats
      await inventoryService.releaseSeatLocks(userId, seatIds);

      await client.query('COMMIT');

      // Remove Redis session
      const redis = await this.connectRedis();
      await redis.del(`booking_session:${bookingId}`);

      console.log(`❌ Cancelled booking ${bookingId} for user ${userId}`);

      return {
        success: true,
        message: 'Booking cancelled successfully'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Booking cancellation error:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      client.release();
    }
  }

  // Cleanup expired bookings (background job)
  async cleanupExpiredBookings() {
    try {
      // Get expired bookings
      const expiredBookings = await dbManager.query(`
        SELECT id, user_id FROM bookings 
        WHERE status = 'pending' 
          AND booking_expires_at < NOW()
      `);

      for (const booking of expiredBookings.rows) {
        await this.cancelBooking(booking.id, booking.user_id);
      }

      console.log(`🧹 Cleaned up ${expiredBookings.rows.length} expired bookings`);
      return expiredBookings.rows.length;

    } catch (error) {
      console.error('Cleanup expired bookings error:', error);
      return 0;
    }
  }
}

module.exports = new BookingService();
