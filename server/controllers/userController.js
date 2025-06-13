const User = require("../../models/User");
const InterviewSession = require("../../models/InterviewSession");
const crypto = require("crypto");

// Register a new user
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if required fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Hash the password (in a real application, use bcrypt)
    const hashedPassword = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    // Create a new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      lastActive: new Date(),
    });

    await user.save();

    // Remove password from response
    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register user",
      error: error.message,
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if required fields are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Hash the password and compare (in a real application, use bcrypt.compare)
    const hashedPassword = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");
    if (hashedPassword !== user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Update last active timestamp
    user.lastActive = new Date();
    await user.save();

    // Remove password from response
    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to login",
      error: error.message,
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
      error: error.message,
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

    // Update the user profile
    if (name) user.name = name;

    // Update professional details
    if (currentPosition)
      user.professionalDetails.currentPosition = currentPosition;
    if (yearsOfExperience)
      user.professionalDetails.yearsOfExperience = yearsOfExperience;
    if (industry) user.professionalDetails.industry = industry;
    if (skills) user.professionalDetails.skills = skills;

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
      message: "Failed to update profile",
      error: error.message,
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

    // Update preferences
    if (defaultInterviewType)
      user.preferences.defaultInterviewType = defaultInterviewType;
    if (defaultSkillLevel)
      user.preferences.defaultSkillLevel = defaultSkillLevel;
    if (notificationsEnabled !== undefined)
      user.preferences.notificationsEnabled = notificationsEnabled;

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
      message: "Failed to update preferences",
      error: error.message,
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

    // Get the user's interview sessions
    const interviewSessions = await InterviewSession.find({ userId }).sort({
      startTime: -1,
    });

    res.status(200).json({
      success: true,
      count: interviewSessions.length,
      interviewSessions,
    });
  } catch (error) {
    console.error("Error getting interview history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get interview history",
      error: error.message,
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
      totalQuestions += session.questions.length;

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

    res.status(200).json({
      success: true,
      statistics,
    });
  } catch (error) {
    console.error("Error getting user statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get statistics",
      error: error.message,
    });
  }
};
