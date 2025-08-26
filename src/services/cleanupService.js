// src/services/cleanupService.js
const bookingService = require('./bookingService');
const inventoryService = require('./inventoryService');

class CleanupService {
  start() {
    console.log('🧹 Starting cleanup service...');
    
    // Run cleanup every 2 minutes
    setInterval(async () => {
      try {
        console.log('🧹 Running cleanup tasks...');
        
        // Cleanup expired bookings
        const expiredBookings = await bookingService.cleanupExpiredBookings();
        
        // Cleanup expired seat locks
        const expiredLocks = await inventoryService.cleanupExpiredLocks();
        
        if (expiredBookings > 0 || expiredLocks > 0) {
          console.log(`🧹 Cleanup completed: ${expiredBookings} bookings, ${expiredLocks} locks`);
        }
        
      } catch (error) {
        console.error('❌ Cleanup service error:', error);
      }
    }, 2 * 60 * 1000); // Every 2 minutes
  }
}

module.exports = new CleanupService();
