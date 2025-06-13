const InterviewSession = require("../../models/InterviewSession");
const User = require("../../models/User");
const { v4: uuidv4 } = require("uuid");
const {
  generateInterviewQuestions,
  evaluateResponse: aiEvaluateResponse,
  generateInterviewFeedback,
} = require("../utils/openaiService");

// Create a new interview session
exports.createSession = async (req, res) => {
  try {
    console.log("Creating interview session with data:", req.body);
    const { userId, jobPosition, interviewType, skillLevel, resumeId } =
      req.body;

    // Validate required fields
    if (!jobPosition || !interviewType || !skillLevel) {
      return res.status(400).json({
        success: false,
        message: "Job position, interview type, and skill level are required",
      });
    }

    // Generate a unique session ID
    const sessionId = uuidv4();
    console.log("Generated session ID:", sessionId);

    // Create a new interview session
    const newSession = new InterviewSession({
      sessionId,
      userId: userId || undefined, // Handle null userId
      jobPosition,
      interviewType: interviewType.toLowerCase(),
      skillLevel: skillLevel.toLowerCase(),
      resumeId: resumeId || undefined,
      status: "in-progress",
      startTime: new Date(),
    });

    await newSession.save();
    console.log("Session saved successfully:", newSession);

    // Add the session to the user's interview history if user is logged in
    if (userId) {
      try {
        await User.findByIdAndUpdate(userId, {
          $push: { interviewHistory: newSession._id },
          lastActive: new Date(),
        });
        console.log("Session added to user history");
      } catch (userErr) {
        console.error("Error updating user history:", userErr);
        // Continue even if user update fails
      }
    } else {
      console.log("Anonymous session created (no userId)");
    }

    res.status(201).json({
      success: true,
      session: newSession,
    });
  } catch (error) {
    console.error("Error creating interview session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create interview session",
      error: error.message,
    });
  }
};

// Get all interview sessions for a user
exports.getUserSessions = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const sessions = await InterviewSession.find({ userId }).sort({
      startTime: -1,
    });

    res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    console.error("Error getting user sessions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user sessions",
      error: error.message,
    });
  }
};

// Get a specific interview session by ID
exports.getSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;

    console.log("========== GET SESSION BY ID ==========");
    console.log("Request params:", req.params);
    console.log("Session ID:", sessionId);

    if (!sessionId) {
      console.log("Error: Session ID is missing");
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    console.log("Finding session with ID:", sessionId);
    const session = await InterviewSession.findOne({ sessionId });
    console.log("Database query completed");

    if (!session) {
      console.log("Session not found with ID:", sessionId);

      // Check if this might be a valid UUID format
      const isValidUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          sessionId
        );

      if (isValidUUID) {
        console.log("Valid UUID format detected, creating recovery session");

        // Create a recovery session with basic information
        const recoverySession = {
          sessionId,
          jobPosition: "Interview Position",
          interviewType: "technical",
          skillLevel: "intermediate",
          questions: [],
          status: "in-progress",
          isRecoverySession: true,
        };

        console.log("Returning recovery session");
        return res.status(200).json({
          success: true,
          session: recoverySession,
          message: "Recovery session created as original was not found",
        });
      }

      return res.status(404).json({
        success: false,
        message: "Interview session not found",
      });
    }

    console.log("Session found:", session.sessionId);
    console.log("Job Position:", session.jobPosition);
    console.log("Interview Type:", session.interviewType);
    console.log("Skill Level:", session.skillLevel);
    console.log(
      "Questions count:",
      session.questions ? session.questions.length : 0
    );

    res.status(200).json({
      success: true,
      session,
    });
    console.log("Response sent successfully");
    console.log("========== END GET SESSION BY ID ==========");
  } catch (error) {
    console.error("Error getting session by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get interview session",
      error: error.message,
    });
  }
};

// Update interview session status
exports.updateSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;

    if (!["in-progress", "completed", "abandoned"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const session = await InterviewSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found",
      });
    }

    session.status = status;

    if (status === "completed") {
      session.endTime = new Date();
    }

    await session.save();

    res.status(200).json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Error updating session status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update session status",
      error: error.message,
    });
  }
};

// Generate interview questions
exports.generateQuestions = async (req, res) => {
  try {
    console.log("========== GENERATE QUESTIONS ==========");
    console.log("Request body:", req.body);

    const {
      jobPosition,
      skillLevel,
      interviewType,
      sessionId,
      previousQuestions = [],
    } = req.body;

    if (!jobPosition || !skillLevel || !interviewType) {
      console.log("Error: Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Job position, skill level, and interview type are required",
      });
    }

    // Generate questions using OpenAI
    console.log("Calling OpenAI service to generate questions");
    console.log("Parameters:", { jobPosition, skillLevel, interviewType });

    try {
      const result = await generateInterviewQuestions(
        jobPosition,
        skillLevel,
        interviewType,
        previousQuestions
      );

      if (
        !result ||
        !result.questions ||
        !Array.isArray(result.questions) ||
        result.questions.length === 0
      ) {
        console.log(
          "Error: Invalid questions format returned from OpenAI service"
        );
        return res.status(500).json({
          success: false,
          message: "Failed to generate valid interview questions",
        });
      }

      console.log("Questions generated successfully");
      console.log("Number of questions:", result.questions.length);
      console.log(
        "First question:",
        result.questions[0].question.substring(0, 50) + "..."
      );

      // If session ID is provided, save the questions to the session
      if (sessionId) {
        try {
          console.log("Finding session with ID:", sessionId);
          const session = await InterviewSession.findOne({ sessionId });

          if (session) {
            console.log("Session found, adding questions");
            // Map the questions to the database format
            const questionObjects = result.questions.map((q) => ({
              question: q.question,
              expectedTopics: q.expectedTopics,
            }));

            // Add the questions to the session
            session.questions.push(...questionObjects);
            await session.save();
            console.log("Questions added to session successfully");
            console.log("Updated question count:", session.questions.length);
          } else {
            console.log("Session not found with ID:", sessionId);
          }
        } catch (sessionErr) {
          console.error("Error updating session with questions:", sessionErr);
          // Continue even if session update fails
        }
      } else {
        console.log("No sessionId provided, not saving questions to a session");
      }

      res.status(200).json({
        success: true,
        questions: result.questions,
      });

      console.log("Response sent successfully");
      console.log("========== END GENERATE QUESTIONS ==========");
    } catch (openaiError) {
      console.error("Error from OpenAI service:", openaiError);
      res.status(500).json({
        success: false,
        message: "Failed to generate interview questions from AI service",
        error: openaiError.message,
      });
    }
  } catch (error) {
    console.error("Error generating questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate interview questions",
      error: error.message,
    });
  }
};

// Submit a response to a question
exports.submitResponse = async (req, res) => {
  try {
    console.log("Submitting response with data:", req.body);
    const { sessionId, questionIndex, response } = req.body;

    if (!sessionId || questionIndex === undefined || !response) {
      return res.status(400).json({
        success: false,
        message: "Session ID, question index, and response are required",
      });
    }

    console.log("Finding session with ID:", sessionId);
    const session = await InterviewSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found",
      });
    }

    // Make sure the question index is valid
    if (questionIndex >= session.questions.length) {
      console.log(
        "Invalid question index:",
        questionIndex,
        "for session with",
        session.questions.length,
        "questions"
      );

      // If we don't have enough questions, it might mean we need to generate more
      if (session.questions.length === 0) {
        console.log(
          "No questions found in session, returning success to trigger question generation"
        );
        return res.status(200).json({
          success: true,
          message: "No questions found, please generate questions first",
          needsQuestions: true,
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid question index",
      });
    }

    // Update the response
    console.log("Updating response for question index:", questionIndex);
    session.questions[questionIndex].response = response;
    session.questions[questionIndex].timestamp = new Date();

    await session.save();
    console.log("Response saved successfully");

    res.status(200).json({
      success: true,
      message: "Response submitted successfully",
      question: session.questions[questionIndex],
    });
  } catch (error) {
    console.error("Error submitting response:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit response",
      error: error.message,
    });
  }
};

// Evaluate a response
exports.evaluateResponse = async (req, res) => {
  try {
    const { sessionId, questionIndex } = req.body;

    if (!sessionId || questionIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: "Session ID and question index are required",
      });
    }

    const session = await InterviewSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found",
      });
    }

    if (questionIndex >= session.questions.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid question index",
      });
    }

    const question = session.questions[questionIndex];

    if (!question.response) {
      return res.status(400).json({
        success: false,
        message: "No response to evaluate",
      });
    }

    // Evaluate the response using OpenAI
    const evaluation = await aiEvaluateResponse(
      question.question,
      question.response,
      question.expectedTopics,
      session.jobPosition
    );

    // Update the evaluation in the session
    session.questions[questionIndex].evaluation = {
      score: evaluation.score,
      feedback: evaluation.feedback,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
    };

    await session.save();

    res.status(200).json({
      success: true,
      evaluation,
    });
  } catch (error) {
    console.error("Error evaluating response:", error);
    res.status(500).json({
      success: false,
      message: "Failed to evaluate response",
      error: error.message,
    });
  }
};

// Generate overall interview feedback
exports.generateFeedback = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await InterviewSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found",
      });
    }

    // Check if there are completed questions with evaluations
    const completedQuestions = session.questions.filter(
      (q) => q.response && q.evaluation && q.evaluation.score
    );

    if (completedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No evaluated responses found",
      });
    }

    // Prepare the question-response pairs for feedback generation
    const questionResponses = completedQuestions.map((q) => ({
      question: q.question,
      response: q.response,
      evaluation: q.evaluation,
    }));

    // Generate feedback using OpenAI
    const feedback = await generateInterviewFeedback(
      questionResponses,
      session.jobPosition
    );

    // Update the feedback in the session
    session.feedback = {
      overallScore: feedback.overall_score,
      summary: feedback.summary,
      strengths: feedback.strengths,
      areasForImprovement: feedback.areas_for_improvement,
      recommendations: feedback.recommendations,
    };

    // Mark the session as completed
    session.status = "completed";
    session.endTime = new Date();

    await session.save();

    res.status(200).json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error("Error generating feedback:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate interview feedback",
      error: error.message,
    });
  }
};

// Get popular job positions for autocomplete
exports.getPopularPositions = async (req, res) => {
  try {
    // Sample popular job positions
    const popularPositions = [
      "Software Engineer",
      "Frontend Developer",
      "Backend Developer",
      "Full Stack Developer",
      "Data Scientist",
      "Machine Learning Engineer",
      "DevOps Engineer",
      "Product Manager",
      "UX Designer",
      "UI Designer",
      "QA Engineer",
      "Mobile Developer",
      "Android Developer",
      "iOS Developer",
      "Project Manager",
      "Scrum Master",
      "Business Analyst",
      "Data Analyst",
    ];

    res.status(200).json({
      success: true,
      positions: popularPositions,
    });
  } catch (error) {
    console.error("Error getting popular positions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get popular positions",
      error: error.message,
    });
  }
};
