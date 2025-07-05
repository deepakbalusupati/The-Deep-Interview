const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const multer = require("multer");
const fs = require("fs");

// Load environment variables with better error handling
try {
  const result = dotenv.config();
  if (result.error) {
    console.warn("Warning: .env file not found. Using default values.");
  } else {
    console.log("Environment variables loaded successfully");
  }
} catch (error) {
  console.warn("Error loading .env file:", error.message);
  console.log("Continuing with default environment variables...");
}

// Set default environment variables with validation
const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/deepinterview";
const NODE_ENV = process.env.NODE_ENV || "development";
const JWT_SECRET =
  process.env.JWT_SECRET || "default-jwt-secret-change-in-production";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5242880; // 5MB default

// Validate critical environment variables
if (NODE_ENV === "production") {
  if (
    !process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY === "your_openai_api_key_here"
  ) {
    console.warn("WARNING: OPENAI_API_KEY not set for production environment");
  }
  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET === "your_jwt_secret_key_here"
  ) {
    console.error("CRITICAL: JWT_SECRET not set for production environment");
    process.exit(1);
  }
}

console.log(`Starting server in ${NODE_ENV} mode`);
console.log(`Server will run on port: ${PORT}`);
console.log(`Client URL: ${CLIENT_URL}`);
console.log(
  `MongoDB URI: ${MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")}`
); // Hide credentials in logs

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure allowed origins based on environment
const allowedOrigins =
  NODE_ENV === "production"
    ? [CLIENT_URL, process.env.PRODUCTION_URL].filter(Boolean)
    : [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
      ];

// Configure Socket.io with proper CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
});

// Enhanced CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In development, allow all localhost origins
      if (NODE_ENV === "development" && origin.includes("localhost")) {
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 200,
  })
);

// Enhanced body parsing with limits
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
if (NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Created uploads directory: ${uploadsDir}`);
  }
} catch (error) {
  console.error("Error creating uploads directory:", error);
}

// Serve files from the uploads directory with security headers
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'");
    next();
  },
  express.static(uploadsDir)
);

// Enhanced file upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Only allow PDF files
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

// Set static folder for production
if (NODE_ENV === "production") {
  const staticPath = path.join(__dirname, "..", "client", "build");
  if (fs.existsSync(staticPath)) {
    app.use(express.static(staticPath));
    console.log(`Serving static files from: ${staticPath}`);
  } else {
    console.warn(
      "Client build directory not found. Run 'npm run build' first."
    );
  }
}

// Global variable to track MongoDB connection status
global.mongoConnected = false;

// Enhanced MongoDB connection with retry logic
const connectMongoDB = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(
        `Attempting MongoDB connection (attempt ${i + 1}/${retries})`
      );
      await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 1,
      });

      console.log("MongoDB connected successfully");
      global.mongoConnected = true;

      // Set up connection event handlers
      mongoose.connection.on("disconnected", () => {
        console.warn("MongoDB disconnected");
        global.mongoConnected = false;
      });

      mongoose.connection.on("reconnected", () => {
        console.log("MongoDB reconnected");
        global.mongoConnected = true;
      });

      break;
    } catch (error) {
      console.error(
        `MongoDB connection attempt ${i + 1} failed:`,
        error.message
      );
      global.mongoConnected = false;

      if (i === retries - 1) {
        console.error("Failed to connect to MongoDB after all retries");
        if (NODE_ENV === "production") {
          process.exit(1);
        } else {
          console.log("Continuing in development mode without database...");
        }
      } else {
        console.log(`Retrying in 5 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }
};

// Connect to MongoDB
connectMongoDB();

// Enhanced middleware to check MongoDB connection
app.use((req, res, next) => {
  // Skip health check routes
  if (req.path.includes("/health")) {
    return next();
  }

  // In development, allow some operations without database
  if (!global.mongoConnected) {
    if (NODE_ENV === "development") {
      console.warn(
        `Warning: Database not connected for ${req.method} ${req.path}`
      );
      // Allow health checks and some GET requests to proceed
      if (
        req.method === "GET" &&
        (req.path === "/" || req.path.startsWith("/api/health"))
      ) {
        return next();
      }
    }

    return res.status(503).json({
      success: false,
      message:
        "Database service temporarily unavailable. Please try again later.",
      error: "DATABASE_UNAVAILABLE",
    });
  }
  next();
});

// Import routes
const interviewRoutes = require("./routes/interview");
const resumeRoutes = require("./routes/resume");
const userRoutes = require("./routes/user");
const healthRoutes = require("./routes/api/health");

// Use routes with error handling
app.use("/api/interview", interviewRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/user", userRoutes);
app.use("/api/health", healthRoutes);

// Enhanced health check endpoint
app.get("/health", (req, res) => {
  const healthStatus = {
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    database: global.mongoConnected ? "connected" : "disconnected",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
  };

  res.status(200).json(healthStatus);
});

// Serve React app in production
if (NODE_ENV === "production") {
  app.get("*", (req, res) => {
    const indexPath = path.join(
      __dirname,
      "..",
      "client",
      "build",
      "index.html"
    );
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: "Client application not found" });
    }
  });
}

// Enhanced Socket.io connection handling
io.on("connection", (socket) => {
  console.log(
    `New client connected: ${socket.id} from ${socket.handshake.address}`
  );

  // Handle interview session joining
  socket.on("join_interview", (sessionId) => {
    if (sessionId && typeof sessionId === "string") {
      socket.join(sessionId);
      console.log(`User ${socket.id} joined interview session: ${sessionId}`);
      socket.emit("joined_interview", { sessionId, success: true });
    } else {
      socket.emit("error", { message: "Invalid session ID" });
    }
  });

  // Handle interview questions and responses
  socket.on("send_question", (data) => {
    if (data?.sessionId) {
      socket.to(data.sessionId).emit("receive_question", data);
      console.log(`Question sent to session: ${data.sessionId}`);
    }
  });

  socket.on("send_response", (data) => {
    if (data?.sessionId) {
      socket.to(data.sessionId).emit("receive_response", data);
      console.log(`Response sent to session: ${data.sessionId}`);
    }
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error(`Socket error from ${socket.id}:`, error);
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Global error handlers
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  if (NODE_ENV === "production") {
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  if (NODE_ENV === "production") {
    process.exit(1);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("HTTP server closed.");
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed.");
      process.exit(0);
    });
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🌐 Client URL: ${CLIENT_URL}`);
  console.log(`📡 Socket.io enabled`);

  if (NODE_ENV === "development") {
    console.log(`🔗 Server URL: http://localhost:${PORT}`);
    console.log(`📋 Health Check: http://localhost:${PORT}/health`);
  }
});

module.exports = { app, server, io };
