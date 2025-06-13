const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please enter a valid email address",
    ],
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  professionalDetails: {
    currentPosition: {
      type: String,
      default: "",
    },
    yearsOfExperience: {
      type: Number,
      default: 0,
    },
    industry: {
      type: String,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
  },
  preferences: {
    defaultInterviewType: {
      type: String,
      enum: ["technical", "behavioral", "mixed", "custom"],
      default: "mixed",
    },
    defaultSkillLevel: {
      type: String,
      enum: ["beginner", "intermediate", "expert"],
      default: "intermediate",
    },
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
  },
  interviewHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewSession",
    },
  ],
  resumes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", UserSchema);
