import express from "express";
import multer from "multer";
import path from "path";
import {
  uploadAllRecordings,
  getAllScriptsWithAudio,
  getUserRecordings,
  getRecordingById,
  deleteRecording,
} from "../controllers/recordingController.js";

const router = express.Router();

// ===== MULTER CONFIGURATION =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const mimeType = file.mimetype;
    const originalName = file.originalname.toLowerCase();
    
    console.log("📁 File received:", {
      name: file.originalname,
      mimetype: mimeType,
      size: file.size
    });
    
    // Accept audio files or webm format
    if (
      mimeType.startsWith("audio/") || 
      mimeType === "application/octet-stream" ||
      originalName.endsWith(".wav") ||
      mimeType.includes("wav")
    ) {
      console.log("✅ File accepted");
      cb(null, true);
    } else {
      console.log("❌ File rejected - invalid type:", mimeType);
      cb(new Error("Only valid audio files are allowed"));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
});

// ===== ROUTES =====
// Error handler wrapper for multer
const handleUploadError = (req, res, next) => {
  upload.single("audio")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error("❌ Multer error:", err.code, err.message);
      
      let message = err.message;
      if (err.code === "LIMIT_FILE_SIZE") {
        message = `File too large. Maximum size: 10MB, received: ${(err.limit / 1024 / 1024).toFixed(2)}MB`;
      }
      
      return res.status(400).json({
        success: false,
        message: message,
      });
    } else if (err) {
      console.error("❌ File upload error:", err.message);
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  });
};

router.post("/upload", handleUploadError, uploadAllRecordings);

router.get("/scripts-with-audio", getAllScriptsWithAudio);
router.get("/user/:userId", getUserRecordings);
router.get("/:recordingId", getRecordingById);
router.delete("/:recordingId", deleteRecording);

// Old error handler removed - not needed
export default router;