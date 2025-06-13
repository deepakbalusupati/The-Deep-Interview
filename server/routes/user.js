const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// Register a new user
router.post("/register", userController.register);

// Login user
router.post("/login", userController.login);

// Get user profile
router.get("/profile", userController.getProfile);

// Update user profile
router.patch("/profile", userController.updateProfile);

// Update user preferences
router.patch("/preferences", userController.updatePreferences);

// Get user interview history
router.get("/history", userController.getInterviewHistory);

// Get user statistics
router.get("/statistics", userController.getStatistics);

module.exports = router;
