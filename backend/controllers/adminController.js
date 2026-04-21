import User from "../models/User.js";
import Script from "../models/Script.js";
import Recording from "../models/Recording.js";
import { removeRecordingAssets } from "../utils/recordingCleanup.js";

// =========================
// ADD USER
// =========================
export const addUser = async (req, res) => {
  try {
    const { name, mobile, email, password } = req.body;

    // ===== VALIDATION =====
    if (!name || !mobile || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Mobile validation (10 digits)
    if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
      return res.status(400).json({ message: "Mobile must be 10 digits" });
    }

    // Email validation
    if (!email.includes("@") || !email.includes(".")) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // Password validation (min 6 chars)
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Check if user exists by mobile or email
    const existingUser = await User.findOne({ $or: [{ mobile }, { email }] });
    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.mobile === mobile ? "Mobile number already registered" : "Email already registered" 
      });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      mobile,
      email,
      password,
    });

    res.json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("ADD USER ERROR:", err);
    res.status(500).json({ message: err.message || "Failed to create user" });
  }
};

// =========================
// GET STATS
// =========================
export const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalScripts = await Script.countDocuments();
    const totalRecordings = await Recording.countDocuments();
    
    // Count completed recordings
    const completedRecordings = await Recording.countDocuments({ status: "completed" });
    
    // Count pending scripts (scripts with status "pending")
    const pendingScripts = await Script.countDocuments({ status: "pending" });

    res.json({
      success: true,
      message: "Stats fetched successfully",
      data: {
        totalUsers,
        totalScripts,
        totalRecordings,
        completedRecordings,
        pendingScripts,
      },
    });
  } catch (err) {
    console.error("GET STATS ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to fetch stats",
      data: null
    });
  }
};


// =========================
// GET ALL SCRIPTS
// =========================
export const getAllScripts = async (req, res) => {
  try {
    const scripts = await Script.find()
      .populate("userId", "name mobile email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: scripts.length,
      scripts,
    });
  } catch (err) {
    console.error("GET ALL SCRIPTS ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to fetch scripts" 
    });
  }
};

// =========================
// UPDATE SCRIPT
// =========================
export const updateScript = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id) {
      return res.status(400).json({ message: "Script ID is required" });
    }

    const updated = await Script.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Script not found" });
    }

    res.json({
      success: true,
      message: "Script updated successfully",
      script: updated,
    });

  } catch (err) {
    console.error("UPDATE SCRIPT ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to update script" 
    });
  }
};

// =========================
// DELETE SCRIPT
// =========================
export const deleteScript = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id) {
      return res.status(400).json({ message: "Script ID is required" });
    }

    const script = await Script.findById(id);

    if (!script) {
      return res.status(404).json({ message: "Script not found" });
    }

    const recordings = await Recording.find({
      $or: [{ scriptId: id }, { script: id }],
    });

    for (const recording of recordings) {
      await removeRecordingAssets(recording);
    }

    if (recordings.length > 0) {
      await Recording.deleteMany({
        _id: { $in: recordings.map((recording) => recording._id) },
      });
    }

    await Script.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Script and related recordings deleted successfully",
      deletedRecordings: recordings.length,
    });

  } catch (err) {
    console.error("DELETE SCRIPT ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to delete script" 
    });
  }
};
