import User from "../models/User.js";
import Script from "../models/Script.js";
import { serializeUserActivity, touchUserActivity } from "../utils/userActivity.js";
import {
  resolveUserRole,
  USER_ROLE_VALIDATION_MESSAGE,
} from "../utils/userRoles.js";

const normalizeEmail = (value = "") => String(value ?? "").trim().toLowerCase();
const normalizeMobile = (value = "") => String(value ?? "").trim();

// =========================
// USER LOGIN (by mobile)
// =========================
export const loginUser = async (req, res) => {
  try {
    const { mobile } = req.body;
    const normalizedMobile = normalizeMobile(mobile);

    // ===== VALIDATION =====
    if (!normalizedMobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    // Find user
    const user = await User.findOne({ mobile: normalizedMobile });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Mobile number not registered",
      });
    }

    if (user.accountStatus === "suspended") {
      return res.status(403).json({
        success: false,
        message: "This user account is suspended. Please contact admin.",
      });
    }

    const activeUser = await touchUserActivity(user._id);

    res.json({
      success: true,
      user: {
        userId: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
        ...serializeUserActivity(activeUser || user),
      },
    });

  } catch (err) {
    console.error("USER LOGIN ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Login failed" 
    });
  }
};

// =========================
// GET NEXT SCRIPT
// =========================
export const getNextScript = async (req, res) => {
  try {
    const { mobile } = req.query;

    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const script = await Script.findOne({
      mobile,
      status: "pending"
    }).populate("userId", "name mobile email");

    if (!script) {
      return res.json({
        success: true,
        script: null,
        message: "All scripts completed",
      });
    }

    res.json({
      success: true,
      script,
    });

  } catch (err) {
    console.error("GET NEXT SCRIPT ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Error fetching script" 
    });
  }
};

// =========================
// COMPLETE SCRIPT
// =========================
export const completeScript = async (req, res) => {
  try {
    const { scriptId, audioUrl } = req.body;

    if (!scriptId) {
      return res.status(400).json({ message: "Script ID is required" });
    }

    const updated = await Script.findByIdAndUpdate(
      scriptId,
      {
        status: "completed",
        audioUrl,
        completedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Script not found" });
    }

    res.json({ 
      success: true,
      message: "Script completed successfully ✅",
      script: updated,
    });

  } catch (err) {
    console.error("COMPLETE SCRIPT ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Error completing script" 
    });
  }
};

// =========================
// ADD USER (via admin)
// =========================
export const addUser = async (req, res) => {
  try {
    const { name, mobile, email, password, role } = req.body;
    const normalizedName = String(name ?? "").trim();
    const normalizedMobile = normalizeMobile(mobile);
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = String(password ?? "");
    const resolvedRole = resolveUserRole(role);

    // ===== VALIDATION =====
    if (!normalizedName || !normalizedMobile || !normalizedEmail || !normalizedPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!resolvedRole) {
      return res.status(400).json({
        success: false,
        message: USER_ROLE_VALIDATION_MESSAGE,
      });
    }

    // Mobile validation
    if (normalizedMobile.length !== 10 || !/^\d+$/.test(normalizedMobile)) {
      return res.status(400).json({ message: "Mobile must be 10 digits" });
    }

    // Email validation
    if (!normalizedEmail.includes("@") || !normalizedEmail.includes(".")) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // Check existing user
    const exists = await User.findOne({
      $or: [{ mobile: normalizedMobile }, { email: normalizedEmail }],
    });
    if (exists) {
      return res.status(400).json({ 
        message:
          exists.mobile === normalizedMobile
            ? "Mobile number already registered"
            : "Email already registered",
      });
    }

    // Create user
    const user = await User.create({
      name: normalizedName,
      mobile: normalizedMobile,
      email: normalizedEmail,
      password: normalizedPassword,
      role: resolvedRole,
    });

    res.json({
      success: true,
      message: "User created successfully",
      user: {
        _id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
      },
    });

  } catch (err) {
    console.error("ADD USER ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to create user" 
    });
  }
};
