const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const resumeController = require("../controllers/resumeController");
const { verifyToken } = require("../controllers/userController");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../../uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Created uploads directory: ${uploadsDir}`);
  }
} catch (error) {
  console.error("Error creating uploads directory:", error);
}

// Enhanced multer configuration for resume uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp and random number
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `resume-${uniqueSuffix}-${sanitizedName}`);
  },
});

// Enhanced file filter for security
const fileFilter = (req, file, cb) => {
  console.log("File upload attempt:", {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  });

  // Check file extension
  const allowedExtensions = /\.pdf$/i;
  const extname = allowedExtensions.test(path.extname(file.originalname));

  // Check MIME type
  const allowedMimeTypes = ["application/pdf"];
  const mimetype = allowedMimeTypes.includes(file.mimetype);

  if (mimetype && extname) {
    console.log("File validation passed");
    return cb(null, true);
  } else {
    console.log("File validation failed:", { mimetype, extname });
    const error = new Error("Only PDF files are allowed!");
    error.code = "INVALID_FILE_TYPE";
    cb(error, false);
  }
};

// Configure multer with enhanced options
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024, // 5MB default
    files: 1,
    fields: 10,
    fieldNameSize: 50,
    fieldSize: 1024,
  },
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  console.error("Upload error:", error);

  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 5MB.",
          error: "FILE_TOO_LARGE",
        });
      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          success: false,
          message: "Too many files. Only one file allowed.",
          error: "TOO_MANY_FILES",
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          success: false,
          message: "Unexpected file field.",
          error: "UNEXPECTED_FILE",
        });
      default:
        return res.status(400).json({
          success: false,
          message: "File upload error.",
          error: error.code,
        });
    }
  } else if (error.code === "INVALID_FILE_TYPE") {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: "INVALID_FILE_TYPE",
    });
  }

  next(error);
};

// Middleware to validate user for protected routes that need userId in query/body
const validateUserId = (req, res, next) => {
  const { userId } = req.query || req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User ID is required",
      error: "MISSING_USER_ID",
    });
  }

  next();
};

// Routes with proper error handling

// Upload a new resume (protected route)
router.post(
  "/upload",
  upload.single("resume"),
  handleUploadError,
  verifyToken,
  resumeController.uploadResume
);

// Get all resumes for a user
router.get("/", verifyToken, resumeController.getUserResumes);

// Get a specific resume by ID
router.get("/:resumeId", resumeController.getResumeById);

// Update resume title
router.patch("/:resumeId", resumeController.updateResumeTitle);

// Delete a resume
router.delete("/:resumeId", resumeController.deleteResume);

// Set a resume as default
router.put("/:resumeId/default", resumeController.setDefaultResume);

// Analyze a resume
router.post("/analyze", verifyToken, resumeController.analyzeResume);

// Extract job position from resume
router.post(
  "/extract-position",
  verifyToken,
  resumeController.extractJobPosition
);

// Health check for resume service
router.get("/health", (req, res) => {
  const healthInfo = {
    status: "ok",
    service: "resume-service",
    timestamp: new Date().toISOString(),
    uploadsDirectory: fs.existsSync(uploadsDir) ? "exists" : "missing",
    diskSpace: (() => {
      try {
        const stats = fs.statSync(uploadsDir);
        return {
          accessible: true,
          path: uploadsDir,
        };
      } catch (error) {
        return {
          accessible: false,
          error: error.message,
        };
      }
    })(),
  };

  res.status(200).json(healthInfo);
});

module.exports = router;
