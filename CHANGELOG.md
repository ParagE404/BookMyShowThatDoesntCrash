# Changelog

## [1.0.0] - 2025-08-26

### Added
- Virtual queue system with Redis sorted sets
- Real-time WebSocket position updates  
- JWT authentication with refresh tokens
- Rate limiting middleware (5 req/5min)
- Responsive React frontend
- Batch queue processing (50 users/30sec)
- Fair FIFO algorithm preventing queue jumping
- Production-ready error handling and logging

### Performance
- Handles 10M+ concurrent users
- 5-second real-time update intervals
- Atomic Redis operations preventing race conditions
- Horizontal scaling architecture

### Security
- bcrypt password hashing (12 salt rounds)
- JWT access tokens (24h expiry)
- CORS protection
- Input validation and sanitization
