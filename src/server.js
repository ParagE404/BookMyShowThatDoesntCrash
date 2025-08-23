const { authLimiter, generalLimiter } = require('./middleware/rateLimit');
const authRoutes = require('./routes/auth');
const queueRoutes = require('./routes/queue');

const http = require('http');
const queueService = require('./services/queueService');

require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");

const { Server } = require('socket.io');
const { startQueueNotifier } = require('./services/queueNotifier');

const app = express();
// Wrap Express app in HTTP server
const server = http.createServer(app);



// Attach Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: ['GET', 'POST']
  }
});
// Middleware to authenticate socket connections
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    console.log(`🔑 Token received: ${token}`);
    const { verifyToken } = require('./utils/jwt');
    const decoded = verifyToken(token);
    socket.user = { id: decoded.userId };
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Handle connections
io.on('connection', (socket) => {
  console.log(`🟢 Socket connected: ${socket.id} (User: ${socket.user.id})`);

  // Join specific queue room
  socket.on('join-queue', ({ eventId }) => {
    const room = `queue:${eventId}:${socket.user.id}`;
    socket.join(room);
    console.log(`🔗 Socket ${socket.id} joined room ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Socket disconnected: ${socket.id}`);
  });
});

// Start the queue notifier with the io instance
startQueueNotifier(io);


const PORT = process.env.PORT || 3000;

// Security and performance middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("combined"));

app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

app.use('/api/auth', authRoutes);

app.use('/api/queue', queueRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/test-rate-limit', (req, res) => {
  res.json({
    message: 'Rate limiting is working!',
    timestamp: new Date().toISOString(),
    ip: req.ip
  });
});

// Basic route
app.get("/", (req, res) => {
  res.json({
    message: "🎫 High-Concurrency Ticketing System",
    version: "1.0.0",
    status: "running",
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🏠 Health check: http://localhost:${PORT}/health`);
});

module.exports = { app, server, io };
