const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { generateTokenPair } = require("../utils/jwt");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Mock user storage (use database in production)
const users = new Map();

// Demo user for testing
async function createDemoUser() {
  try {
    const hashedPassword = await bcrypt.hash("password123", 12);
    const demoUser = {
      id: "demo-user-123",
      email: "coldplay@fan.com",
      password: hashedPassword, // Fresh hash that will work
      firstName: "Coldplay",
      lastName: "Fan",
      role: "user",
      createdAt: new Date().toISOString(),
    };

    users.set("coldplay@fan.com", demoUser);
    console.log("✅ Demo user created: coldplay@fan.com / password123");
  } catch (error) {
    console.error("❌ Failed to create demo user:", error);
  }
}

// Initialize demo user
createDemoUser();

// Validation rules
const loginValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
];

const registerValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }),
  body("firstName").trim().isLength({ min: 2, max: 50 }),
  body("lastName").trim().isLength({ min: 2, max: 50 }),
];

// Handle validation errors
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        message: "Validation failed",
        details: errors.array(),
      },
    });
  }
  next();
}

// Register endpoint
router.post(
  "/register",
  registerValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (users.has(email)) {
        return res.status(409).json({
          error: { message: "User already exists", code: "USER_EXISTS" },
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = {
        id: `user-${Date.now()}`,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: "user",
      };

      users.set(email, user);
      const tokens = generateTokenPair(user);

      const { password: _, ...userWithoutPassword } = user;

      res.status(201).json({
        success: true,
        data: {
          user: userWithoutPassword,
          ...tokens,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: { message: "Registration failed", code: "REGISTRATION_ERROR" },
      });
    }
  }
);

// Login endpoint - this is what will face 13M concurrent users!
router.post(
  "/login",
  loginValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const startTime = process.hrtime.bigint();
      const { email, password } = req.body;

      const user = users.get(email);
      console.log("User found:", !!user);
      console.log(
        "Stored password hash:",
        user?.password?.substring(0, 20) + "..."
      );
      console.log("Input password:", password);

      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log("Password valid:", isPasswordValid);
      if (!user) {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Prevent timing attacks
        return res.status(401).json({
          error: {
            message: "Invalid credentials",
            code: "INVALID_CREDENTIALS",
          },
        });
      }

      if (!isPasswordValid) {
        return res.status(401).json({
          error: {
            message: "Invalid credentials",
            code: "INVALID_CREDENTIALS",
          },
        });
      }

      console.log("User authenticated:", user.email);

      const tokens = generateTokenPair(user);
      const { password: _, ...userWithoutPassword } = user;

      const endTime = process.hrtime.bigint();
      const responseTimeMs = Number(endTime - startTime) / 1000000;

      res.json({
        success: true,
        data: {
          user: userWithoutPassword,
          ...tokens,
        },
        meta: {
          responseTimeMs: Math.round(responseTimeMs),
        },
      });
    } catch (error) {
      res.status(500).json({
        error: { message: "Login failed", code: "LOGIN_ERROR" },
      });
    }
  }
);

// Protected profile endpoint
router.get("/profile", authenticate, (req, res) => {
  res.json({
    success: true,
    data: { user: req.user },
  });
});

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "authentication",
    totalUsers: users.size,
  });
});

router.get("/debug/users", async (req, res) => {
  const userList = Array.from(users.keys()).map(async (email) => {
    const user = users.get(email);
    return {
      email: user.email,
      id: user.id,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
    };
  });

  res.json({
    totalUsers: users.size,
    users: userList,
  });
});

module.exports = router;
