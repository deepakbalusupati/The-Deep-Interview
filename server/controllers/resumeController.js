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

    // Get userId from authenticated user (set by verifyToken middleware)
    const userId = req.user._id;
    const { title } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const originalFilename = req.file.originalname;
    const storedFilename = req.file.filename;
    const filePath = req.file.path;
    const fileType = path.extname(originalFilename).slice(1).toLowerCase();

    // Extract text content from the resume
    let content = "";
    if (fileType === "pdf") {
      try {
        content = await extractTextFromPDF(filePath);
      } catch (error) {
        console.error("Error extracting PDF content:", error);
        // Continue with empty content if extraction fails
        content = "Failed to extract content from PDF";
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Unsupported file type. Only PDF files are allowed.",
      });
    }

    // Create a new resume
    const newResume = new Resume({
      userId,
      name: title || originalFilename.replace(/\.[^/.]+$/, ""),
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
    // Get userId from authenticated user (set by verifyToken middleware)
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
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

// Update resume title
exports.updateResumeTitle = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const { title } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const resume = await Resume.findById(resumeId);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    resume.name = title;
    await resume.save();

    res.status(200).json({
      success: true,
      message: "Resume title updated successfully",
      resume,
    });
  } catch (error) {
    console.error("Error updating resume title:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update resume title",
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

// Set a resume as default/active
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
      { $set: { isDefault: false, isActive: false } }
    );

    // Set the selected resume as default and active
    resume.isDefault = true;
    resume.isActive = true;
    await resume.save();

    res.status(200).json({
      success: true,
      message: "Resume set as active",
      resume,
    });
  } catch (error) {
    console.error("Error setting active resume:", error);
    res.status(500).json({
      success: false,
      message: "Failed to set active resume",
      error: error.message,
    });
  }
};

// Analyze a resume
exports.analyzeResume = async (req, res) => {
  try {
    const { resumeId } = req.body;

    if (!resumeId) {
      return res.status(400).json({
        success: false,
        message: "Resume ID is required",
      });
    }

    const resume = await Resume.findById(resumeId);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    // For now, just return a simple analysis
    // In a real application, you would use AI or other services to analyze the content
    const analysis = {
      skills: ["Communication", "Problem Solving", "Teamwork"],
      experience: ["Entry Level", "Mid Level"],
      education: ["Bachelor's Degree"],
      strengths: ["Technical Knowledge", "Adaptability"],
      weaknesses: ["Limited Experience"],
      suggestedPositions: ["Software Engineer", "Web Developer"],
      summary: "This candidate has a good foundation of skills and education.",
    };

    // Update the resume with the analysis
    resume.analysis = analysis;
    resume.lastAnalyzedAt = new Date();
    await resume.save();

    res.status(200).json({
      success: true,
      message: "Resume analyzed successfully",
      analysis,
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

// Extract job position from resume
exports.extractJobPosition = async (req, res) => {
  try {
    const { resumeId } = req.body;

    if (!resumeId) {
      return res.status(400).json({
        success: false,
        message: "Resume ID is required",
      });
    }

    const resume = await Resume.findById(resumeId);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    // Use the analyzeResume function from openaiService to extract job position
    const { analyzeResume } = require("../utils/openaiService");

    try {
      // If resume already has analysis with suggested positions, use that
      if (
        resume.analysis &&
        resume.analysis.suggestedPositions &&
        resume.analysis.suggestedPositions.length > 0
      ) {
        return res.status(200).json({
          success: true,
          suggestedPosition: resume.analysis.suggestedPositions[0],
          allSuggestions: resume.analysis.suggestedPositions,
        });
      }

      // Otherwise, analyze the resume content to extract job position
      const analysis = await analyzeResume(resume.content, "general");

      // Extract the most suitable job position from the analysis
      let suggestedPosition = "Software Engineer"; // Default fallback

      if (
        analysis.personalized_questions &&
        analysis.personalized_questions.length > 0
      ) {
        // Try to extract position from the analysis
        const content = resume.content.toLowerCase();

        // Common job titles to look for in resume content
        const jobTitles = [
          "software engineer",
          "software developer",
          "full stack developer",
          "frontend developer",
          "backend developer",
          "web developer",
          "data scientist",
          "data analyst",
          "machine learning engineer",
          "product manager",
          "project manager",
          "scrum master",
          "devops engineer",
          "cloud engineer",
          "system administrator",
          "ui/ux designer",
          "ux designer",
          "ui designer",
          "graphic designer",
          "qa engineer",
          "test engineer",
          "quality assurance",
          "business analyst",
          "systems analyst",
          "technical analyst",
          "mobile developer",
          "ios developer",
          "android developer",
          "database administrator",
          "network engineer",
          "security engineer",
        ];

        // Find the first matching job title in the resume content
        for (const title of jobTitles) {
          if (content.includes(title)) {
            suggestedPosition = title
              .split(" ")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
            break;
          }
        }
      }

      // Update resume with the analysis if it doesn't exist
      if (!resume.analysis) {
        resume.analysis = {
          suggestedPositions: [suggestedPosition],
          summary:
            analysis.analysis || "Position extracted from resume content",
        };
        resume.lastAnalyzedAt = new Date();
        await resume.save();
      }

      res.status(200).json({
        success: true,
        suggestedPosition,
        analysis: analysis.analysis,
      });
    } catch (analysisError) {
      console.error("Error in AI analysis, using fallback:", analysisError);

      // Fallback: Simple keyword-based extraction
      const content = resume.content.toLowerCase();
      let suggestedPosition = "Software Engineer"; // Default

      // Simple keyword matching
      if (
        content.includes("data scientist") ||
        content.includes("machine learning")
      ) {
        suggestedPosition = "Data Scientist";
      } else if (content.includes("product manager")) {
        suggestedPosition = "Product Manager";
      } else if (
        content.includes("frontend") ||
        content.includes("react") ||
        content.includes("vue")
      ) {
        suggestedPosition = "Frontend Developer";
      } else if (
        content.includes("backend") ||
        content.includes("api") ||
        content.includes("server")
      ) {
        suggestedPosition = "Backend Developer";
      } else if (
        content.includes("full stack") ||
        content.includes("fullstack")
      ) {
        suggestedPosition = "Full Stack Developer";
      } else if (
        content.includes("devops") ||
        content.includes("aws") ||
        content.includes("cloud")
      ) {
        suggestedPosition = "DevOps Engineer";
      } else if (
        content.includes("designer") ||
        content.includes("ui") ||
        content.includes("ux")
      ) {
        suggestedPosition = "UI/UX Designer";
      }

      res.status(200).json({
        success: true,
        suggestedPosition,
        analysis: "Position extracted using keyword matching",
      });
    }
  } catch (error) {
    console.error("Error extracting job position:", error);
    res.status(500).json({
      success: false,
      message: "Failed to extract job position from resume",
      error: error.message,
    });
  }
};
