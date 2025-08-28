// src/models/database.js
const { Pool } = require("pg");
require("dotenv").config();

class DatabaseManager {
  constructor() {
    // Create connection pool for better performance
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DATABASE_SSL === "true"
          ? { rejectUnauthorized: false }
          : false,
      max: 20, // Maximum number of clients in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on("connect", () => {
      console.log("✅ Connected to Neon PostgreSQL database");
    });

    this.pool.on("error", (err) => {
      console.error("❌ PostgreSQL pool error:", err);
    });

    this.initializeTables();
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log("📊 Query executed:", {
        text: text.substring(0, 50) + "...",
        duration,
        rows: res.rowCount,
      });
      return res;
    } catch (error) {
      console.error("❌ Database query error:", error);
      throw error;
    }
  }

  async initializeTables() {
    try {
      // Enable UUID extension
      await this.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

      // Events table
      await this.query(`
        CREATE TABLE IF NOT EXISTS events (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(500) NOT NULL,
          description TEXT,
          venue VARCHAR(500) NOT NULL,
          event_date TIMESTAMPTZ NOT NULL,
          total_seats INTEGER NOT NULL,
          available_seats INTEGER NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Seat categories and pricing
      await this.query(`
        CREATE TABLE IF NOT EXISTS seat_categories (
          id VARCHAR(255) PRIMARY KEY,
          event_id VARCHAR(255) NOT NULL,
          category_name VARCHAR(100) NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          total_seats INTEGER NOT NULL,
          available_seats INTEGER NOT NULL,
          description TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
          UNIQUE(event_id, category_name)
        )
      `);

      // Individual seats (for assigned seating)
      await this.query(`
        CREATE TABLE IF NOT EXISTS seats (
          id VARCHAR(255) PRIMARY KEY,
          event_id VARCHAR(255) NOT NULL,
          category_id VARCHAR(255) NOT NULL,
          seat_number VARCHAR(50) NOT NULL,
          row_number VARCHAR(10),
          section VARCHAR(50),
          status VARCHAR(20) DEFAULT 'available', -- available, locked, sold
          locked_until TIMESTAMPTZ DEFAULT NULL,
          locked_by_user VARCHAR(255) DEFAULT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES seat_categories (id) ON DELETE CASCADE,
          UNIQUE(event_id, category_id, seat_number)
        )
      `);

      // Booking records
      await this.query(`
        CREATE TABLE IF NOT EXISTS bookings (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id VARCHAR(255) NOT NULL,
          event_id VARCHAR(255) NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'INR',
          status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled, failed
          payment_status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded
          payment_id VARCHAR(255) DEFAULT NULL,
          booking_expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          confirmed_at TIMESTAMPTZ DEFAULT NULL,
          FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
        )
      `);

      // Booking items (individual seat bookings)
      await this.query(`
        CREATE TABLE IF NOT EXISTS booking_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          booking_id UUID NOT NULL,
          seat_id VARCHAR(255) NOT NULL,
          category_id VARCHAR(255) NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE,
          FOREIGN KEY (seat_id) REFERENCES seats (id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES seat_categories (id) ON DELETE CASCADE
        )
      `);

      // Create indexes for performance
      await this.query(
        "CREATE INDEX IF NOT EXISTS idx_seats_event_status ON seats(event_id, status)"
      );
      await this.query(
        "CREATE INDEX IF NOT EXISTS idx_seats_locked_until ON seats(locked_until) WHERE locked_until IS NOT NULL"
      );
      await this.query(
        "CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)"
      );
      await this.query(
        "CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)"
      );
      await this.query(
        "CREATE INDEX IF NOT EXISTS idx_bookings_expires ON bookings(booking_expires_at)"
      );
      await this.query(
        "CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id)"
      );

      console.log("✅ PostgreSQL tables initialized successfully");

      // Seed demo data
      await this.seedData();
    } catch (error) {
      console.error("❌ Error initializing database tables:", error);
      throw error;
    }
  }

  async seedData() {
    try {
      // Define events to seed
      const events = [
        {
          id: "coldplay-mumbai-2025",
          name: "Coldplay: Music Of The Spheres World Tour",
          description: "Experience the magic of Coldplay live in Mumbai",
          venue: "DY Patil Stadium, Mumbai",
          date: "2025-01-19T19:00:00+05:30",
          totalSeats: 50000,
          categories: [
            {
              id: "silver",
              name: "Silver",
              price: 2500,
              totalSeats: 30000,
              description: "General seating area with great view",
            },
            {
              id: "gold",
              name: "Gold",
              price: 7500,
              totalSeats: 15000,
              description: "Premium seating closer to stage",
            },
            {
              id: "platinum",
              name: "Platinum",
              price: 12500,
              totalSeats: 5000,
              description: "VIP seating with exclusive amenities",
            },
          ],
        },
        {
          id: "taylor-swift-mumbai-2025",
          name: "Taylor Swift: The Eras Tour",
          description:
            "Join Taylor Swift on her spectacular Eras Tour in Mumbai",
          venue: "Jio World Garden, Mumbai",
          date: "2025-03-15T19:30:00+05:30",
          totalSeats: 45000,
          categories: [
            {
              id: "general",
              name: "General Admission",
              price: 3500,
              totalSeats: 25000,
              description: "Standing area with amazing energy",
            },
            {
              id: "premium",
              name: "Premium",
              price: 8500,
              totalSeats: 15000,
              description: "Reserved seating with excellent view",
            },
            {
              id: "vip",
              name: "VIP",
              price: 15000,
              totalSeats: 5000,
              description: "VIP experience with exclusive perks",
            },
          ],
        },
      ];

      for (const event of events) {
        // Check if event already exists
        const existingEvent = await this.query(
          "SELECT id FROM events WHERE id = $1",
          [event.id]
        );

        if (existingEvent.rows.length > 0) {
          console.log(`✅ Event ${event.name} already exists`);
          continue;
        }

        // Insert event
        await this.query(
          `
          INSERT INTO events (id, name, description, venue, event_date, total_seats, available_seats)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
          [
            event.id,
            event.name,
            event.description,
            event.venue,
            event.date,
            event.totalSeats,
            event.totalSeats,
          ]
        );

        // Insert seat categories for this event
        for (const category of event.categories) {
          const categoryId = `${event.id}-${category.id}`;
          await this.query(
            `
            INSERT INTO seat_categories (id, event_id, category_name, price, total_seats, available_seats, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
            [
              categoryId,
              event.id,
              category.name,
              category.price,
              category.totalSeats,
              category.totalSeats,
              category.description,
            ]
          );
        }

        // Generate seats for each event
        await this.generateSampleSeats(event.id);
        console.log(`✅ Event ${event.name} seeded successfully`);
      }

      console.log("✅ All demo event data seeded successfully");
    } catch (error) {
      console.error("❌ Error seeding demo data:", error);
      throw error;
    }
  }

  async generateSampleSeats(eventId) {
    try {
      // Define seat configurations for different events
      const eventSeatConfigs = {
        "coldplay-mumbai-2025": [
          {
            id: "silver",
            sections: ["A", "B"],
            rowsPerSection: 5,
            seatsPerRow: 10,
          },
          {
            id: "gold",
            sections: ["VIP-1", "VIP-2"],
            rowsPerSection: 3,
            seatsPerRow: 8,
          },
          {
            id: "platinum",
            sections: ["PLAT-1"],
            rowsPerSection: 2,
            seatsPerRow: 6,
          },
        ],
        "taylor-swift-mumbai-2025": [
          {
            id: "general",
            sections: ["GA-1", "GA-2"],
            rowsPerSection: 4,
            seatsPerRow: 12,
          },
          {
            id: "premium",
            sections: ["PREM-1", "PREM-2"],
            rowsPerSection: 4,
            seatsPerRow: 10,
          },
          {
            id: "vip",
            sections: ["VIP-1"],
            rowsPerSection: 3,
            seatsPerRow: 8,
          },
        ],
      };

      const categories =
        eventSeatConfigs[eventId] || eventSeatConfigs["coldplay-mumbai-2025"];

      console.log(`🎫 Generating sample seats for ${eventId}...`);

      for (const category of categories) {
        const categoryId = `${eventId}-${category.id}`;

        for (const section of category.sections) {
          for (let row = 1; row <= category.rowsPerSection; row++) {
            for (let seat = 1; seat <= category.seatsPerRow; seat++) {
              const seatId = `${eventId}-${category.id}-${section}-${row}-${seat}`;
              const seatNumber = `${section}-${row}-${seat}`;

              await this.query(
                `
                INSERT INTO seats (id, event_id, category_id, seat_number, row_number, section)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (event_id, category_id, seat_number) DO NOTHING
              `,
                [
                  seatId,
                  eventId,
                  categoryId,
                  seatNumber,
                  row.toString(),
                  section,
                ]
              );
            }
          }
        }
      }

      console.log(`✅ Sample seats generated for ${eventId}`);
    } catch (error) {
      console.error("❌ Error generating seats:", error);
      throw error;
    }
  }

  async close() {
    await this.pool.end();
    console.log("🔌 Database pool closed");
  }
}

// Singleton instance
const dbManager = new DatabaseManager();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Received SIGINT, closing database connection...");
  await dbManager.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🛑 Received SIGTERM, closing database connection...");
  await dbManager.close();
  process.exit(0);
});

module.exports = dbManager;
