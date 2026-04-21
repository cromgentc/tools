import User from "../models/User.js";
import Script from "../models/Script.js";
import Recording from "../models/Recording.js";
import { removeRecordingAssets } from "../utils/recordingCleanup.js";
import fs from "fs";
import xlsx from "xlsx";

const normalizeUserPayload = (input = {}) => ({
  name: String(input.name ?? input.Name ?? input.fullName ?? input["Full Name"] ?? "").trim(),
  mobile: String(input.mobile ?? input.Mobile ?? input.phone ?? input.Phone ?? "").trim(),
  email: String(input.email ?? input.Email ?? "").trim().toLowerCase(),
  password: String(input.password ?? input.Password ?? input.pass ?? input.Pass ?? "").trim(),
});

const validateUserPayload = ({ name, mobile, email, password }) => {
  if (!name || !mobile || !email || !password) {
    return "All fields are required";
  }

  if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
    return "Mobile must be 10 digits";
  }

  if (!email.includes("@") || !email.includes(".")) {
    return "Invalid email address";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }

  return null;
};

const safeDeleteFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const createUserError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const createUserRecord = async (rawInput) => {
  const payload = normalizeUserPayload(rawInput);
  const validationError = validateUserPayload(payload);

  if (validationError) {
    throw createUserError(validationError);
  }

  const existingUser = await User.findOne({
    $or: [{ mobile: payload.mobile }, { email: payload.email }],
  });

  if (existingUser) {
    throw createUserError(
      existingUser.mobile === payload.mobile
        ? "Mobile number already registered"
        : "Email already registered"
    );
  }

  return User.create(payload);
};

// =========================
// ADD USER
// =========================
export const addUser = async (req, res) => {
  try {
    const user = await createUserRecord(req.body);

    res.json({
      success: true,
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
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to create user",
    });
  }
};

// =========================
// BULK ADD USERS
// =========================
export const bulkAddUsers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      safeDeleteFile(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Excel or CSV file is empty",
      });
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

    if (!Array.isArray(rows) || rows.length === 0) {
      safeDeleteFile(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Excel or CSV file is empty or invalid format",
      });
    }

    const inserted = [];
    const errors = [];

    for (let i = 0; i < rows.length; i += 1) {
      try {
        const user = await createUserRecord(rows[i]);

        inserted.push({
          userId: user._id,
          name: user.name,
          mobile: user.mobile,
          email: user.email,
          status: "Added",
        });
      } catch (rowErr) {
        errors.push(`Row ${i + 1}: ${rowErr.message}`);
      }
    }

    safeDeleteFile(req.file.path);

    res.json({
      success: true,
      message: `Bulk user upload completed. ${inserted.length} users added, ${errors.length} errors`,
      inserted,
      errors,
    });
  } catch (err) {
    safeDeleteFile(req.file?.path);
    console.error("BULK ADD USER ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to process bulk user upload",
    });
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
