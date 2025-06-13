const express = require("express");
const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "Server is running",
  });
});

/**
 * @route   GET /api/health/details
 * @desc    Detailed health check with environment info
 * @access  Public
 */
router.get("/details", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "Server is running",
    environment: process.env.NODE_ENV || "development",
    apiVersion: "1.0.0",
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    mongoConnected: !!global.mongoConnected,
  });
});

module.exports = router;
