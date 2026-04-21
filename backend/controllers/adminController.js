import User from "../models/User.js";
import Script from "../models/Script.js";
import Recording from "../models/Recording.js";
import Record from "../models/Record.js";
import Metadata from "../models/Metadata.js";
import { removeRecordingAssets } from "../utils/recordingCleanup.js";
import fs from "fs";
import xlsx from "xlsx";
import { serializeUserActivity } from "../utils/userActivity.js";

const USER_ACCOUNT_STATUSES = new Set(["active", "inactive", "suspended"]);

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

const buildUserSummary = ({ user, scripts, recordings }) => {
  const completedScripts = scripts.filter((script) => script.status === "completed").length;
  const pendingScripts = scripts.filter((script) => script.status === "pending").length;

  return {
    _id: user._id,
    name: user.name,
    mobile: user.mobile,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    totalScripts: scripts.length,
    completedScripts,
    pendingScripts,
    totalRecordings: recordings.length,
    ...serializeUserActivity(user),
  };
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
// GET ALL USERS
// =========================
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const userIds = users.map((user) => user._id);

    const [scripts, recordings] = await Promise.all([
      Script.find({ userId: { $in: userIds } }).select("userId status").lean(),
      Recording.find({ userId: { $in: userIds } }).select("userId").lean(),
    ]);

    const scriptsByUser = new Map();
    const recordingsByUser = new Map();

    for (const script of scripts) {
      const key = String(script.userId);
      const current = scriptsByUser.get(key) || [];
      current.push(script);
      scriptsByUser.set(key, current);
    }

    for (const recording of recordings) {
      const key = String(recording.userId);
      const current = recordingsByUser.get(key) || [];
      current.push(recording);
      recordingsByUser.set(key, current);
    }

    const result = users.map((user) =>
      buildUserSummary({
        user,
        scripts: scriptsByUser.get(String(user._id)) || [],
        recordings: recordingsByUser.get(String(user._id)) || [],
      })
    );

    res.json({
      success: true,
      count: result.length,
      users: result,
    });
  } catch (err) {
    console.error("GET ALL USERS ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch users",
    });
  }
};

// =========================
// GET USER DETAILS
// =========================
export const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await User.findById(id).select("-password").lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const [scripts, recordings] = await Promise.all([
      Script.find({ userId: id }).sort({ createdAt: -1 }).lean(),
      Recording.find({ userId: id })
        .populate("scriptId", "content status createdAt completedAt")
        .sort({ uploadedAt: -1 })
        .lean(),
    ]);

    const summary = buildUserSummary({
      user,
      scripts,
      recordings,
    });

    res.json({
      success: true,
      user: {
        ...summary,
        history: user.history || [],
        scripts: scripts.map((script) => ({
          _id: script._id,
          content: script.content,
          status: script.status,
          createdAt: script.createdAt,
          completedAt: script.completedAt || null,
        })),
        recordings: recordings.map((recording) => ({
          _id: recording._id,
          audioLink: recording.audioLink,
          fileSize: recording.fileSize || 0,
          uploadedAt: recording.uploadedAt,
          script: recording.scriptId
            ? {
                _id: recording.scriptId._id,
                content: recording.scriptId.content,
                status: recording.scriptId.status,
                createdAt: recording.scriptId.createdAt,
                completedAt: recording.scriptId.completedAt || null,
              }
            : null,
        })),
      },
    });
  } catch (err) {
    console.error("GET USER DETAILS ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch user details",
    });
  }
};

// =========================
// UPDATE USER STATUS
// =========================
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountStatus } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!USER_ACCOUNT_STATUSES.has(accountStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user status",
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      {
        accountStatus,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User status updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        ...serializeUserActivity(user),
      },
    });
  } catch (err) {
    console.error("UPDATE USER STATUS ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to update user status",
    });
  }
};

// =========================
// DELETE USER
// =========================
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Admin users cannot be deleted from this screen",
      });
    }

    const userIdString = String(user._id);

    const scripts = await Script.find({
      $or: [{ userId: id }, { mobile: user.mobile }, { email: user.email }],
    })
      .select("_id")
      .lean();

    const scriptIds = scripts.map((script) => script._id);

    const recordings = await Recording.find({
      $or: [
        { userId: id },
        { user: id },
        ...(scriptIds.length > 0
          ? [{ scriptId: { $in: scriptIds } }, { script: { $in: scriptIds } }]
          : []),
      ],
    });

    for (const recording of recordings) {
      await removeRecordingAssets(recording);
    }

    if (recordings.length > 0) {
      await Recording.deleteMany({
        _id: { $in: recordings.map((recording) => recording._id) },
      });
    }

    const [deletedScriptsResult, deletedRecordsResult, deletedMetadataResult] = await Promise.all([
      Script.deleteMany({
        $or: [{ userId: id }, { mobile: user.mobile }, { email: user.email }],
      }),
      Record.deleteMany({ userId: userIdString }),
      Metadata.deleteMany({ userId: userIdString }),
    ]);

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "User and all related backend data deleted successfully",
      deletedScripts: deletedScriptsResult.deletedCount || scripts.length,
      deletedRecordings: recordings.length,
      deletedRecords: deletedRecordsResult.deletedCount || 0,
      deletedMetadata: deletedMetadataResult.deletedCount || 0,
    });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to delete user",
    });
  }
};

// =========================
// GET STATS
// =========================
export const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: { $ne: "admin" } });
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
