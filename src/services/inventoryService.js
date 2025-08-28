// src/services/inventoryService.js
const dbManager = require('../models/database');
const { v4: uuidv4 } = require('uuid');

class InventoryService {
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
      console.log('✅ Inventory service connected to Redis');
    }
    return this.redis;
  }

  // Get available seats for an event category
  async getAvailableSeats(eventId, categoryId = null, limit = 100) {
    try {
      let query = `
        SELECT s.*, sc.price, sc.category_name
        FROM seats s
        JOIN seat_categories sc ON s.category_id = sc.id
        WHERE s.event_id = $1 
          AND s.status = 'available'
          AND (s.locked_until IS NULL OR s.locked_until < NOW())
      `;
      
      const params = [eventId];
      let paramIndex = 2;
      
      if (categoryId) {
        query += ` AND s.category_id = $${paramIndex}`;
        params.push(categoryId);
        paramIndex++;
      }
      
      query += ` ORDER BY s.section, s.row_number, s.seat_number LIMIT $${paramIndex}`;
      params.push(limit);
  
      const result = await dbManager.query(query, params);
      return result.rows || []; // Ensure we always return an array
  
    } catch (error) {
      console.error('Error fetching available seats:', error);
      return []; // Return empty array on error
    }
  }

  async getAllSeats(eventId, categoryId = null, limit = 100) {
    try {
      let query = `
        SELECT s.*, sc.price, sc.category_name
        FROM seats s
        JOIN seat_categories sc ON s.category_id = sc.id
        WHERE s.event_id = $1
      `;
      const params = [eventId];
      let paramIndex = 2;
  
      if (categoryId) {
        query += ` AND s.category_id = $${paramIndex}`;
        params.push(categoryId);
        paramIndex++;
      }
  
      query += ` ORDER BY s.section, s.row_number, s.seat_number LIMIT $${paramIndex}`;
      params.push(limit);
  
      const result = await dbManager.query(query, params);
      return result.rows || [];
    } catch (error) {
      console.error('Error fetching all seats:', error);
      return [];
    }
  }
  

  // Lock seats for a user (10-minute reservation)
  async lockSeats(userId, seatIds, durationMinutes = 10) {
    const client = await dbManager.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
      const lockedSeats = [];

      for (const seatId of seatIds) {
        const result = await client.query(`
          UPDATE seats 
          SET status = 'locked', 
              locked_until = $1, 
              locked_by_user = $2
          WHERE id = $3 
            AND status = 'available'
            AND (locked_until IS NULL OR locked_until < NOW())
        `, [expiresAt, userId, seatId]);

        if (result.rowCount > 0) {
          lockedSeats.push(seatId);
          
          // Set Redis lock for distributed coordination
          const redis = await this.connectRedis();
          await redis.setEx(`seat_lock:${seatId}`, durationMinutes * 60, userId);
        }
      }

      await client.query('COMMIT');

      console.log(`🔒 Locked ${lockedSeats.length}/${seatIds.length} seats for user ${userId}`);
      
      return {
        success: true,
        lockedSeats,
        expiresAt: expiresAt.toISOString(),
        lockDurationMinutes: durationMinutes
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Seat locking error:', error);
      return {
        success: false,
        error: 'Failed to lock seats',
        lockedSeats: []
      };
    } finally {
      client.release();
    }
  }

  // Release locked seats (when booking expires or is cancelled)
  async releaseSeatLocks(userId, seatIds = null) {
    try {
      let query = `
        UPDATE seats 
        SET status = 'available',
            locked_until = NULL,
            locked_by_user = NULL
        WHERE locked_by_user = $1
          AND status = 'locked'
      `;
      
      const params = [userId];
      
      if (seatIds && seatIds.length > 0) {
        const placeholders = seatIds.map((_, index) => `$${index + 2}`).join(',');
        query += ` AND id IN (${placeholders})`;
        params.push(...seatIds);
      }

      const result = await dbManager.query(query, params);

      // Remove Redis locks
      const redis = await this.connectRedis();
      if (seatIds) {
        for (const seatId of seatIds) {
          await redis.del(`seat_lock:${seatId}`);
        }
      } else {
        // Get all locked seats for this user
        const userSeatsResult = await dbManager.query(
          'SELECT id FROM seats WHERE locked_by_user = $1 AND status = $2',
          [userId, 'locked']
        );
        
        for (const seat of userSeatsResult.rows) {
          await redis.del(`seat_lock:${seat.id}`);
        }
      }

      console.log(`🔓 Released ${result.rowCount} seat locks for user ${userId}`);
      
      return {
        success: true,
        releasedCount: result.rowCount
      };

    } catch (error) {
      console.error('Seat release error:', error);
      return {
        success: false,
        error: 'Failed to release seats'
      };
    }
  }

  // Clean up expired locks (run periodically)
  async cleanupExpiredLocks() {
    try {
      const result = await dbManager.query(`
        UPDATE seats 
        SET status = 'available',
            locked_until = NULL,
            locked_by_user = NULL
        WHERE status = 'locked'
          AND locked_until < NOW()
      `);
      
      if (result.rowCount > 0) {
        console.log(`🧹 Cleaned up ${result.rowCount} expired seat locks`);
      }
      
      return result.rowCount;

    } catch (error) {
      console.error('Lock cleanup error:', error);
      return 0;
    }
  }

  // Get inventory summary
  async getInventorySummary(eventId) {
    try {
      const result = await dbManager.query(`
        SELECT 
          sc.category_name,
          sc.price,
          COUNT(CASE WHEN s.status = 'available' THEN 1 END) as available,
          COUNT(CASE WHEN s.status = 'locked' THEN 1 END) as locked,
          COUNT(CASE WHEN s.status = 'sold' THEN 1 END) as sold,
          COUNT(*) as total
        FROM seat_categories sc
        LEFT JOIN seats s ON sc.id = s.category_id
        WHERE sc.event_id = $1
        GROUP BY sc.id, sc.category_name, sc.price
        ORDER BY sc.price
      `, [eventId]);
      
      return result.rows;

    } catch (error) {
      console.error('Error getting inventory summary:', error);
      throw error;
    }
  }
}

module.exports = new InventoryService();
