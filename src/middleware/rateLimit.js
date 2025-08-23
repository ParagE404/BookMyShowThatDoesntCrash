const { createClient } = require('redis');

// Redis connection
let redisClient;

const connectRedis = async () => {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    redisClient.on('error', (err) => {
      console.error('❌ Redis Error:', err.message);
    });
    
    redisClient.on('connect', () => {
      console.log('✅ Redis connected for rate limiting');
    });
    
    await redisClient.connect();
  }
  return redisClient;
};

// Initialize Redis
connectRedis().catch(console.error);

// Sliding window rate limiter
async function slidingWindowRateLimit(identifier, maxRequests, windowMs) {
  const redis = await connectRedis();
  const key = `rate_limit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Atomic Redis operations
    const pipeline = redis.multi();
    
    // Remove old entries
    pipeline.zRemRangeByScore(key, 0, windowStart);
    
    // Count current entries
    pipeline.zCard(key);
    
    // Add current request
    pipeline.zAdd(key, {
      score: now,
      value: `${now}-${Math.random()}`
    });
    
    // Set expiration
    pipeline.expire(key, Math.ceil(windowMs / 1000));
    
    const results = await pipeline.exec();
    const currentRequests = results[1]; // Not results[1][1]

    
    return {
      allowed: currentRequests < maxRequests,
      current: currentRequests,
      remaining: Math.max(0, maxRequests - currentRequests - 1),
      resetTime: now + windowMs
    };
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fail open - allow request if Redis fails
    return { allowed: true, current: 0, remaining: maxRequests, resetTime: now + windowMs };
  }
}

// Rate limiter middleware factory
function createRateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,
    maxRequests = 60,
    keyGenerator = (req) => req.ip,
    message = 'Too many requests, please try again later.'
  } = options;

  return async (req, res, next) => {
    try {
      const identifier = keyGenerator(req);
      const result = await slidingWindowRateLimit(identifier, maxRequests, windowMs);

      // Add rate limit headers
      res.set({
        'RateLimit-Limit': maxRequests,
        'RateLimit-Remaining': result.remaining,
        'RateLimit-Reset': new Date(result.resetTime).toISOString()
      });

      if (!result.allowed) {
        console.log(`🚫 Rate limit exceeded for ${identifier}: ${result.current}/${maxRequests}`);
        
        return res.status(429).json({
          error: {
            message,
            code: 'RATE_LIMIT_EXCEEDED',
            current: result.current,
            limit: maxRequests,
            resetTime: result.resetTime
          }
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      next(); // Fail open
    }
  };
}

// Pre-configured limiters
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  keyGenerator: (req) => `auth:${req.ip}:${req.body?.email || req.ip}`,
  message: 'Too many authentication attempts. Please try again in 15 minutes.'
});

const generalLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: 'Too many requests. Please wait a moment.'
});

const queueLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 5, // 5 queue operations per 5 minutes
    keyGenerator: (req) => `queue:${req.user?.id || req.ip}`,
    message: 'You can only join/leave queues 5 times per 5 minutes.'
  });

module.exports = {
  createRateLimiter,
  authLimiter,
  generalLimiter,
  queueLimiter, // <-- Add this line
  slidingWindowRateLimit // For testing
};
