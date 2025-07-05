const User = require("../../models/User");
const InterviewSession = require("../../models/InterviewSession");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Get JWT secret from environment variables
const JWT_SECRET =
  process.env.JWT_SECRET || "default-jwt-secret-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Helper function to validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function to validate password strength
const isValidPassword = (password) => {
  return password && password.length >= 6;
};

// Register a new user
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
        errors: {
          name: !name?.trim() ? "Name is required" : null,
          email: !email?.trim() ? "Email is required" : null,
          password: !password ? "Password is required" : null,
        },
      });
    }

    // Validate email format
    if (!isValidEmail(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
        errors: { email: "Invalid email format" },
      });
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
        errors: { password: "Password must be at least 6 characters long" },
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      email: email.trim().toLowerCase(),
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
        errors: { email: "Email already registered" },
      });
    }

    // Hash the password using bcrypt
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create a new user
    const user = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      createdAt: new Date(),
      lastActive: new Date(),
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Error registering user:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
        errors: { email: "Email already registered" },
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to register user",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
        errors: {
          email: !email?.trim() ? "Email is required" : null,
          password: !password ? "Password is required" : null,
        },
      });
    }

    // Validate email format
    if (!isValidEmail(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
        errors: { email: "Invalid email format" },
      });
    }

    // Find the user
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        errors: { credentials: "Invalid email or password" },
      });
    }

    // Compare password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        errors: { credentials: "Invalid email or password" },
      });
    }

    // Update last active timestamp
    user.lastActive = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to login",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Middleware to verify JWT token
exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
        error: "MISSING_TOKEN",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid token - user not found",
          error: "INVALID_TOKEN",
        });
      }

      req.user = user;
      next();
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired",
          error: "TOKEN_EXPIRED",
        });
      } else if (jwtError.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
          error: "INVALID_TOKEN",
        });
      } else {
        throw jwtError;
      }
    }
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(500).json({
      success: false,
      message: "Token verification failed",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error getting user profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user profile",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.query;
    const { name, currentPosition, yearsOfExperience, industry, skills } =
      req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update the user profile with validation
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
          errors: { name: "Name cannot be empty" },
        });
      }
      user.name = name.trim();
    }

    // Update professional details
    if (currentPosition !== undefined) {
      user.professionalDetails.currentPosition = currentPosition.trim();
    }
    if (yearsOfExperience !== undefined) {
      const years = parseInt(yearsOfExperience);
      if (isNaN(years) || years < 0 || years > 70) {
        return res.status(400).json({
          success: false,
          message:
            "Years of experience must be a valid number between 0 and 70",
          errors: { yearsOfExperience: "Invalid years of experience" },
        });
      }
      user.professionalDetails.yearsOfExperience = years;
    }
    if (industry !== undefined) {
      user.professionalDetails.industry = industry.trim();
    }
    if (skills !== undefined) {
      if (Array.isArray(skills)) {
        user.professionalDetails.skills = skills
          .map((skill) => skill.trim())
          .filter((skill) => skill.length > 0);
      } else {
        return res.status(400).json({
          success: false,
          message: "Skills must be an array",
          errors: { skills: "Skills must be an array" },
        });
      }
    }

    user.lastActive = new Date();
    await user.save();

    // Remove password from response
    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user profile",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Update user preferences
exports.updatePreferences = async (req, res) => {
  try {
    const { userId } = req.query;
    const { defaultInterviewType, defaultSkillLevel, notificationsEnabled } =
      req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update preferences with validation
    if (defaultInterviewType !== undefined) {
      const validTypes = ["technical", "behavioral", "mixed", "custom"];
      if (!validTypes.includes(defaultInterviewType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid interview type",
          errors: {
            defaultInterviewType: `Must be one of: ${validTypes.join(", ")}`,
          },
        });
      }
      user.preferences.defaultInterviewType = defaultInterviewType;
    }

    if (defaultSkillLevel !== undefined) {
      const validLevels = ["beginner", "intermediate", "expert"];
      if (!validLevels.includes(defaultSkillLevel)) {
        return res.status(400).json({
          success: false,
          message: "Invalid skill level",
          errors: {
            defaultSkillLevel: `Must be one of: ${validLevels.join(", ")}`,
          },
        });
      }
      user.preferences.defaultSkillLevel = defaultSkillLevel;
    }

    if (notificationsEnabled !== undefined) {
      user.preferences.notificationsEnabled = Boolean(notificationsEnabled);
    }

    user.lastActive = new Date();
    await user.save();

    // Remove password from response
    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: "Preferences updated successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user preferences",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Get user interview history
exports.getInterviewHistory = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get the user's interview sessions with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const interviewSessions = await InterviewSession.find({ userId })
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .select("-questions.response -questions.evaluation"); // Exclude detailed response data for performance

    const totalSessions = await InterviewSession.countDocuments({ userId });

    return res.status(200).json({
      success: true,
      count: interviewSessions.length,
      total: totalSessions,
      page,
      totalPages: Math.ceil(totalSessions / limit),
      interviewSessions: interviewSessions || [],
    });
  } catch (error) {
    console.error("Error getting interview history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get interview history",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Get user statistics
exports.getStatistics = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get the user's interview sessions
    const interviewSessions = await InterviewSession.find({
      userId,
      status: "completed",
    });

    // Calculate statistics
    const totalInterviews = interviewSessions.length;
    let totalQuestions = 0;
    let totalDuration = 0;
    let averageScore = 0;
    let totalScores = 0;
    let totalScoredSessions = 0;

    const interviewTypes = {};
    const skillLevels = {};
    const jobPositions = {};

    interviewSessions.forEach((session) => {
      // Count total questions
      totalQuestions += session.questions?.length || 0;

      // Sum up durations
      if (session.duration) {
        totalDuration += session.duration;
      }

      // Calculate average score
      if (session.feedback && session.feedback.overallScore) {
        totalScores += session.feedback.overallScore;
        totalScoredSessions++;
      }

      // Count interview types
      if (session.interviewType) {
        interviewTypes[session.interviewType] =
          (interviewTypes[session.interviewType] || 0) + 1;
      }

      // Count skill levels
      if (session.skillLevel) {
        skillLevels[session.skillLevel] =
          (skillLevels[session.skillLevel] || 0) + 1;
      }

      // Count job positions
      if (session.jobPosition) {
        jobPositions[session.jobPosition] =
          (jobPositions[session.jobPosition] || 0) + 1;
      }
    });

    // Calculate average score
    if (totalScoredSessions > 0) {
      averageScore = totalScores / totalScoredSessions;
    }

    // Calculate average duration in minutes
    const averageDurationMinutes =
      totalInterviews > 0
        ? Math.round(totalDuration / totalInterviews / 60)
        : 0;

    // Format statistics
    const statistics = {
      totalInterviews,
      totalQuestions,
      averageScore,
      averageDurationMinutes,
      interviewTypes: Object.entries(interviewTypes).map(([type, count]) => ({
        type,
        count,
      })),
      skillLevels: Object.entries(skillLevels).map(([level, count]) => ({
        level,
        count,
      })),
      popularPositions: Object.entries(jobPositions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([position, count]) => ({ position, count })),
    };

    return res.status(200).json({
      success: true,
      statistics,
    });
  } catch (error) {
    console.error("Error getting user statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get statistics",
      error: error.message,
    });
  }
};
