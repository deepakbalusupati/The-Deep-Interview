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

// Load environment variables
try {
  dotenv.config();
  console.log("Environment variables loaded");
} catch (error) {
  console.warn("Error loading .env file:", error.message);
}

// Set default environment variables if not present
const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/deepinterview";
const NODE_ENV = process.env.NODE_ENV || "development";

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set up file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Set static folder
if (NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "..", "client", "build")));
}

// Import routes
const interviewRoutes = require("./routes/interview");
const resumeRoutes = require("./routes/resume");
const userRoutes = require("./routes/user");
const healthRoutes = require("./routes/api/health");

// Use routes
app.use("/api/interview", interviewRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/user", userRoutes);
app.use("/api/health", healthRoutes);

// Simple health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// Serve static assets in production
if (NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
  });
}

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Handle interview session
  socket.on("join_interview", (sessionId) => {
    socket.join(sessionId);
    console.log(`User joined interview session: ${sessionId}`);
  });

  // Handle interview questions and responses
  socket.on("send_question", (data) => {
    socket.to(data.sessionId).emit("receive_question", data);
  });

  socket.on("send_response", (data) => {
    socket.to(data.sessionId).emit("receive_response", data);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Global variable to track MongoDB connection status
global.mongoConnected = false;

// Connect to MongoDB
console.log(`Connecting to MongoDB at: ${MONGO_URI}`);
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    global.mongoConnected = true;
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    global.mongoConnected = false;
  });

// Start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { app, server, io };
