const Resume = require("../../models/Resume");
const User = require("../../models/User");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const { analyzeResume } = require("../utils/openaiService");

// Helper function to extract text from PDF
const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw error;
  }
};

// Helper function to extract text from text file
const extractTextFromTXT = (filePath) => {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    console.error("Error extracting text from TXT file:", error);
    throw error;
  }
};

// Upload a new resume
exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const { userId, title } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const originalFilename = req.file.originalname;
    const storedFilename = req.file.filename;
    const filePath = req.file.path;
    const fileType = path.extname(originalFilename).slice(1).toLowerCase();

    // Extract text content from the resume
    let content = "";
    if (fileType === "pdf") {
      content = await extractTextFromPDF(filePath);
    } else if (fileType === "txt") {
      content = extractTextFromTXT(filePath);
    } else {
      // For other file types, we would need additional libraries
      return res.status(400).json({
        success: false,
        message: "Unsupported file type",
      });
    }

    // Create a new resume
    const newResume = new Resume({
      userId,
      name: title || originalFilename,
      originalFilename,
      storedFilename,
      filePath,
      fileType,
      content,
      uploadedAt: new Date(),
    });

    await newResume.save();

    // Add the resume to the user's resumes
    await User.findByIdAndUpdate(userId, {
      $push: { resumes: newResume._id },
      lastActive: new Date(),
    });

    // If this is the user's first resume, set it as default
    const userResumes = await Resume.find({ userId });
    if (userResumes.length === 1) {
      newResume.isDefault = true;
      await newResume.save();
    }

    res.status(201).json({
      success: true,
      resume: newResume,
    });
  } catch (error) {
    console.error("Error uploading resume:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload resume",
      error: error.message,
    });
  }
};

// Get all resumes for a user
exports.getUserResumes = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const resumes = await Resume.find({ userId }).sort({ uploadedAt: -1 });

    res.status(200).json({
      success: true,
      count: resumes.length,
      resumes,
    });
  } catch (error) {
    console.error("Error getting user resumes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user resumes",
      error: error.message,
    });
  }
};

// Get a specific resume by ID
exports.getResumeById = async (req, res) => {
  try {
    const { resumeId } = req.params;

    const resume = await Resume.findById(resumeId);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    res.status(200).json({
      success: true,
      resume,
    });
  } catch (error) {
    console.error("Error getting resume by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get resume",
      error: error.message,
    });
  }
};

// Delete a resume
exports.deleteResume = async (req, res) => {
  try {
    const { resumeId } = req.params;

    const resume = await Resume.findById(resumeId);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    // Remove the file from the filesystem
    if (fs.existsSync(resume.filePath)) {
      fs.unlinkSync(resume.filePath);
    }

    // Remove the resume from the user's resumes
    await User.findByIdAndUpdate(resume.userId, {
      $pull: { resumes: resumeId },
    });

    // Delete the resume from the database
    await Resume.findByIdAndDelete(resumeId);

    // If the deleted resume was the default, set another resume as default
    if (resume.isDefault) {
      const anotherResume = await Resume.findOne({
        userId: resume.userId,
        _id: { $ne: resumeId },
      });

      if (anotherResume) {
        anotherResume.isDefault = true;
        await anotherResume.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Resume deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting resume:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete resume",
      error: error.message,
    });
  }
};

// Set a resume as default
exports.setDefaultResume = async (req, res) => {
  try {
    const { resumeId } = req.params;

    const resume = await Resume.findById(resumeId);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    // Unset default for all other resumes of the user
    await Resume.updateMany(
      { userId: resume.userId },
      { $set: { isDefault: false } }
    );

    // Set the selected resume as default
    resume.isDefault = true;
    await resume.save();

    res.status(200).json({
      success: true,
      message: "Resume set as default",
      resume,
    });
  } catch (error) {
    console.error("Error setting default resume:", error);
    res.status(500).json({
      success: false,
      message: "Failed to set default resume",
      error: error.message,
    });
  }
};

// Analyze a resume and generate personalized questions
exports.analyzeResume = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const { jobPosition } = req.body;

    if (!jobPosition) {
      return res.status(400).json({
        success: false,
        message: "Job position is required",
      });
    }

    const resume = await Resume.findById(resumeId);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    // Analyze the resume using OpenAI
    const analysis = await analyzeResume(resume.content, jobPosition);

    // Update the resume with the analysis
    resume.analysis = {
      skills: analysis.strengths || [],
      experience: [],
      education: [],
      strengths: analysis.strengths || [],
      weaknesses: analysis.areas_to_explore || [],
      suggestedPositions: [],
      summary: analysis.analysis || "",
    };

    resume.lastAnalyzedAt = new Date();
    await resume.save();

    res.status(200).json({
      success: true,
      analysis,
      personalizedQuestions: analysis.personalized_questions || [],
    });
  } catch (error) {
    console.error("Error analyzing resume:", error);
    res.status(500).json({
      success: false,
      message: "Failed to analyze resume",
      error: error.message,
    });
  }
};
