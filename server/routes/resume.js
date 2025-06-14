const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const resumeController = require("../controllers/resumeController");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for resume uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accept only pdf files
    const filetypes = /pdf/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Error: Only PDF files are allowed!"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
});

// Upload a new resume
router.post("/upload", upload.single("resume"), resumeController.uploadResume);

// Get all resumes for a user
router.get("/", resumeController.getUserResumes);

// Get a specific resume by ID
router.get("/:resumeId", resumeController.getResumeById);

// Update resume title
router.patch("/:resumeId", resumeController.updateResumeTitle);

// Delete a resume
router.delete("/:resumeId", resumeController.deleteResume);

// Set a resume as default
router.post("/:resumeId/set-active", resumeController.setDefaultResume);

// Analyze a resume
router.post("/analyze", resumeController.analyzeResume);

module.exports = router;
