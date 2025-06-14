const mongoose = require("mongoose");

const ResumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  originalFilename: {
    type: String,
    required: true,
  },
  storedFilename: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    enum: ["pdf", "docx", "txt"],
    required: true,
  },
  content: {
    type: String, // Extracted text content from the resume
    required: true,
  },
  analysis: {
    skills: {
      type: [String],
      default: [],
    },
    experience: {
      type: [String],
      default: [],
    },
    education: {
      type: [String],
      default: [],
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    suggestedPositions: {
      type: [String],
      default: [],
    },
    summary: {
      type: String,
      default: "",
    },
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  lastAnalyzedAt: {
    type: Date,
  },
});

module.exports = mongoose.model("Resume", ResumeSchema);
