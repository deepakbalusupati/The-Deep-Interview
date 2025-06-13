const express = require("express");
const router = express.Router();
const interviewController = require("../controllers/interviewController");

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

// Create a new interview session
router.post("/sessions", interviewController.createSession);

// Get all interview sessions for a user
router.get("/sessions", interviewController.getUserSessions);

// Get a specific interview session by ID
router.get("/sessions/:sessionId", interviewController.getSessionById);

// Update interview session status
router.patch(
  "/sessions/:sessionId/status",
  interviewController.updateSessionStatus
);

// Generate interview questions
router.post("/questions", interviewController.generateQuestions);

// Submit a response to a question
router.post("/response", interviewController.submitResponse);

// Evaluate a response
router.post("/evaluate", interviewController.evaluateResponse);

// Generate overall interview feedback
router.post(
  "/sessions/:sessionId/feedback",
  interviewController.generateFeedback
);

// Get popular job positions for autocomplete
router.get("/positions", interviewController.getPopularPositions);

module.exports = router;
