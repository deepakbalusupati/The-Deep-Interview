const mongoose = require("mongoose");

const QuestionResponseSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  expectedTopics: {
    type: String,
    required: true,
  },
  response: {
    type: String,
    default: "",
  },
  evaluation: {
    score: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
    },
    feedback: {
      type: String,
      default: "",
    },
    strengths: {
      type: [String],
      default: [],
    },
    improvements: {
      type: [String],
      default: [],
    },
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const InterviewSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  jobPosition: {
    type: String,
    required: true,
  },
  interviewType: {
    type: String,
    enum: ["technical", "behavioral", "mixed", "custom"],
    required: true,
  },
  skillLevel: {
    type: String,
    enum: ["beginner", "intermediate", "expert"],
    required: true,
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resume",
  },
  questions: [QuestionResponseSchema],
  feedback: {
    overallScore: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
    },
    summary: {
      type: String,
      default: "",
    },
    strengths: {
      type: [String],
      default: [],
    },
    areasForImprovement: {
      type: [String],
      default: [],
    },
    recommendations: {
      type: [String],
      default: [],
    },
  },
  status: {
    type: String,
    enum: ["in-progress", "completed", "abandoned"],
    default: "in-progress",
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },
  duration: {
    type: Number, // Duration in seconds
  },
});

// Calculate duration before saving if session is completed
InterviewSessionSchema.pre("save", function (next) {
  if (this.status === "completed" && this.endTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
  next();
});

module.exports = mongoose.model("InterviewSession", InterviewSessionSchema);
