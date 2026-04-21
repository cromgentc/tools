import Recording from "../models/Recording.js";
import Script from "../models/Script.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

// =========================
// UPLOAD RECORDING
// =========================
export const uploadAllRecordings = async (req, res) => {
  try {
    const { scriptId, userId } = req.body;

    console.log("Upload request received:", { scriptId, userId, fileName: req.file?.filename, mimeType: req.file?.mimetype, size: req.file?.size });

    // ===== VALIDATION =====
    if (!scriptId || scriptId === "null") {
      return res.status(400).json({ 
        success: false,
        message: "Invalid Script ID - no script assigned to this user" 
      });
    }

    if (!userId || userId === "null") {
      return res.status(400).json({ 
        success: false,
        message: "Invalid User ID" 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: "No audio file uploaded" 
      });
    }

    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (req.file.size > maxSize) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false,
        message: "File size exceeds 10MB limit" 
      });
    }

    // Verify script exists
    const script = await Script.findById(scriptId);
    if (!script) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ 
        success: false,
        message: "Script not found - please refresh and try again" 
      });
    }

    // ===== UPLOAD TO CLOUDINARY =====
    console.log("📁 Processing file:", { path: req.file.path, size: req.file.size, name: req.file.filename });
    
    let audioLink;
    let public_id;
    
    try {
      // Audio files are best delivered from Cloudinary via the video resource type.
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
        folder: "audio_uploads",
        public_id: `recording-${Date.now()}`,
      });
      audioLink = result.secure_url.replace("/raw/upload/", "/video/upload/");
      public_id = result.public_id;
      console.log("✅ Cloudinary upload successful:", {
        public_id,
        resource_type: result.resource_type,
        audioLink,
      });
    } catch (cloudinaryErr) {
      // If Cloudinary fails, serve from local uploads folder
      console.warn("⚠️ Cloudinary upload failed, using local storage:", cloudinaryErr.message);
      const backendBaseUrl = (
        process.env.BACKEND_URL || "https://recording-tools.onrender.com"
      ).replace(/\/+$/, "");
      audioLink = `${backendBaseUrl}/uploads/${req.file.filename}`;
      public_id = null; // No public_id for local files
    }

    // ===== SAVE IN MONGODB =====
    const recording = await Recording.create({
      filename: req.file.filename,
      audioLink,
      public_id: public_id || null,
      scriptId,
      userId,
      fileSize: req.file.size,
      uploadedAt: new Date(),
    });

    // ===== UPDATE SCRIPT STATUS =====
    await Script.findByIdAndUpdate(scriptId, {
      status: "completed",
      completedAt: new Date(),
      audioLink,
    });

    // ===== DELETE LOCAL FILE ONLY IF UPLOADED TO CLOUDINARY =====
    if (public_id) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      message: "Recording uploaded successfully",
      recording: {
        id: recording._id,
        audioLink,
        uploadedAt: recording.uploadedAt,
      },
    });

  } catch (err) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error("UPLOAD RECORDING ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to upload recording" 
    });
  }
};


// =========================
// GET ALL SCRIPTS WITH AUDIO
// =========================
// export const getAllScriptsWithAudio = async (req, res) => {
//   try {
//     const scripts = await Script.find()
//       .populate("userId", "name mobile email")
//       .sort({ createdAt: -1 });

//     if (!scripts || scripts.length === 0) {
//       return res.json({
//         success: true,
//         count: 0,
//         message: "No scripts found",
//         scripts: [],
//       });
//     }

//     const result = scripts.map((script) => ({
//       _id: script._id,
//       userId: script.userId,
//       mobile: script.mobile,
//       email: script.email,
//       content: script.content,
//       status: script.status,
//       audioLink: script.audioLink || null,
//       createdAt: script.createdAt,
//       completedAt: script.completedAt || null,
//     }));

//     res.json({
//       success: true,
//       count: result.length,
//       scripts: result,
//     });

//   } catch (err) {
//     console.error("GET ALL SCRIPTS WITH AUDIO ERROR:", err);
//     res.status(500).json({ 
//       success: false,
//       message: err.message || "Failed to fetch scripts" 
//     });
//   }
// };
export const getAllScriptsWithAudio = async (req, res) => {
  try {
    const scripts = await Script.find()
      .populate("userId", "name mobile email")
      .sort({ createdAt: -1 })
      .lean();

    const recordings = await Recording.find();

    const result = scripts.map((script) => {
      const rec = recordings.find(
        (r) => r.scriptId.toString() === script._id.toString()
      );

      return {
        _id: script._id,
        userId: script.userId,
        mobile: script.mobile,
        email: script.email,
        content: script.content,
        status: script.status,

        // 🔥 MAIN FIX
        audioLink: script.audioLink || rec?.audioLink || null,

        createdAt: script.createdAt,
        completedAt: script.completedAt || null,
      };
    });

    res.json({
      success: true,
      count: result.length,
      scripts: result,
    });

  } catch (err) {
    console.error("GET ALL SCRIPTS WITH AUDIO ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to fetch scripts" 
    });
  }
};

// =========================
// GET USER RECORDINGS
// =========================
export const getUserRecordings = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: "User ID is required" 
      });
    }

    const recordings = await Recording.find({ userId })
      .populate("scriptId", "content mobile email")
      .sort({ uploadedAt: -1 });

    if (!recordings || recordings.length === 0) {
      return res.json({
        success: true,
        count: 0,
        message: "No recordings found for this user",
        recordings: [],
      });
    }

    res.json({
      success: true,
      count: recordings.length,
      recordings: recordings.map(r => ({
        _id: r._id,
        audioLink: r.audioLink,
        scriptContent: r.scriptId?.content,
        scriptMobile: r.scriptId?.mobile,
        scriptEmail: r.scriptId?.email,
        fileSize: r.fileSize,
        uploadedAt: r.uploadedAt,
      })),
    });

  } catch (err) {
    console.error("GET USER RECORDINGS ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to fetch recordings" 
    });
  }
};


// =========================
// GET RECORDING BY ID
// =========================
export const getRecordingById = async (req, res) => {
  try {
    const { recordingId } = req.params;

    if (!recordingId) {
      return res.status(400).json({ 
        success: false,
        message: "Recording ID is required" 
      });
    }

    const recording = await Recording.findById(recordingId)
      .populate("scriptId", "content mobile email status")
      .populate("userId", "name mobile email");

    if (!recording) {
      return res.status(404).json({ 
        success: false,
        message: "Recording not found" 
      });
    }

    res.json({
      success: true,
      recording: {
        _id: recording._id,
        audioLink: recording.audioLink,
        user: recording.userId,
        script: recording.scriptId,
        fileSize: recording.fileSize,
        uploadedAt: recording.uploadedAt,
      },
    });

  } catch (err) {
    console.error("GET RECORDING BY ID ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to fetch recording" 
    });
  }
};


// =========================
// DELETE RECORDING
// =========================
export const deleteRecording = async (req, res) => {
  try {
    const { recordingId } = req.params;

    if (!recordingId) {
      return res.status(400).json({ 
        success: false,
        message: "Recording ID is required" 
      });
    }

    const recording = await Recording.findById(recordingId);

    if (!recording) {
      return res.status(404).json({ 
        success: false,
        message: "Recording not found" 
      });
    }

    // Delete from Cloudinary (if it was uploaded there)
    if (recording.public_id) {
      try {
        await cloudinary.uploader.destroy(recording.public_id, {
          resource_type: "video",
        });
        console.log("✅ Deleted from Cloudinary:", recording.public_id);
      } catch (cloudErr) {
        console.warn("⚠️ Cloudinary deletion error:", cloudErr.message);
        // Continue even if Cloudinary deletion fails
      }
    }

    // Delete local file if it exists
    if (recording.filename) {
      const localPath = `uploads/${recording.filename}`;
      if (fs.existsSync(localPath)) {
        try {
          fs.unlinkSync(localPath);
          console.log("✅ Deleted local file:", localPath);
        } catch (fsErr) {
          console.warn("⚠️ Failed to delete local file:", fsErr.message);
        }
      }
    }

    // Delete from MongoDB
    await Recording.findByIdAndDelete(recordingId);

    res.json({
      success: true,
      message: "Recording deleted successfully",
    });

  } catch (err) {
    console.error("DELETE RECORDING ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to delete recording" 
    });
  }
};
