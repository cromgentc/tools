import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { serializeUserActivity, touchUserActivity } from "../utils/userActivity.js";
import { sendPasswordResetOtp } from "../utils/passwordResetDelivery.js";
import {
  resolveUserRole,
  USER_ROLE_VALIDATION_MESSAGE,
} from "../utils/userRoles.js";

const PASSWORD_RESET_OTP_WINDOW_MS = 10 * 60 * 1000;
const PASSWORD_RESET_SESSION_WINDOW_MS = 10 * 60 * 1000;
const PASSWORD_RESET_SELECT = "+passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetMethod +passwordResetTarget +passwordResetSessionHash +passwordResetSessionExpiresAt";

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const normalizeEmail = (value = "") => String(value ?? "").trim().toLowerCase();
const normalizeMobile = (value = "") => String(value ?? "").trim();

const isValidEmail = (value = "") => value.includes("@") && value.includes(".");
const isValidMobile = (value = "") => /^\d{10}$/.test(value);
const isValidOtp = (value = "") => /^\d{6}$/.test(value);

const hashValue = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const generateOtp = () =>
  String(Math.floor(100000 + Math.random() * 900000));

const getPasswordResetQuery = ({ method, email, mobile }) => {
  if (method === "email") {
    return { email: normalizeEmail(email) };
  }

  if (method === "mobile") {
    return { mobile: normalizeMobile(mobile) };
  }

  return null;
};

const getPasswordResetTarget = ({ method, email, mobile }) =>
  method === "email" ? normalizeEmail(email) : normalizeMobile(mobile);

const clearPasswordResetState = (user) => {
  user.passwordResetOtpHash = null;
  user.passwordResetOtpExpiresAt = null;
  user.passwordResetMethod = null;
  user.passwordResetTarget = null;
  user.passwordResetSessionHash = null;
  user.passwordResetSessionExpiresAt = null;
};

// REGISTER
export const registerUser = async (req, res) => {
  try {
    const { name, mobile, email, password, role } = req.body;
    const normalizedName = String(name ?? "").trim();
    const normalizedMobile = normalizeMobile(String(mobile ?? ""));
    const normalizedEmail = normalizeEmail(String(email ?? ""));
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

    // Mobile validation (10 digits)
    if (!isValidMobile(normalizedMobile)) {
      return res.status(400).json({ message: "Mobile must be 10 digits" });
    }

    // Email validation
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // Password validation (min 6 chars)
    if (normalizedPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ mobile: normalizedMobile }, { email: normalizedEmail }],
    });
    if (existingUser) {
      return res.status(400).json({ 
        message:
          existingUser.mobile === normalizedMobile
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

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        _id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
      },
      token: generateToken(user),
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to register" 
    });
  }
};

// LOGIN
export const loginUser = async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const normalizedMobile = normalizeMobile(String(mobile ?? ""));
    const normalizedPassword = String(password ?? "");

    // ===== VALIDATION =====
    if (!normalizedMobile || !normalizedPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find user by mobile
    const user = await User.findOne({ mobile: normalizedMobile });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.accountStatus === "suspended") {
      return res.status(403).json({
        success: false,
        message: "This user account is suspended. Please contact admin.",
      });
    }

    // Verify password
    const isPasswordValid = await user.matchPassword(normalizedPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const activeUser = await touchUserActivity(user._id);

    // Generate token and return
    res.json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
        ...serializeUserActivity(activeUser || user),
      },
      token: generateToken(user),
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to login" 
    });
  }
};

export const reportUserActivity = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await touchUserActivity(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: serializeUserActivity(user),
    });
  } catch (err) {
    console.error("USER ACTIVITY ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to update user activity",
    });
  }
};

export const requestPasswordResetOtp = async (req, res) => {
  try {
    const { method, email, mobile } = req.body;
    const query = getPasswordResetQuery({ method, email, mobile });

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Choose email or mobile for password reset",
      });
    }

    if (method === "email" && !isValidEmail(normalizeEmail(email))) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address",
      });
    }

    if (method === "mobile" && !isValidMobile(normalizeMobile(mobile))) {
      return res.status(400).json({
        success: false,
        message: "Mobile must be 10 digits",
      });
    }

    const user = await User.findOne(query).select(PASSWORD_RESET_SELECT);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          method === "email"
            ? "Email is not registered"
            : "Mobile number is not registered",
      });
    }

    if (user.accountStatus === "suspended") {
      return res.status(403).json({
        success: false,
        message: "This user account is suspended. Please contact admin.",
      });
    }

    const otp = generateOtp();

    user.passwordResetOtpHash = hashValue(otp);
    user.passwordResetOtpExpiresAt = new Date(
      Date.now() + PASSWORD_RESET_OTP_WINDOW_MS
    );
    user.passwordResetMethod = method;
    user.passwordResetTarget = getPasswordResetTarget({ method, email, mobile });
    user.passwordResetSessionHash = null;
    user.passwordResetSessionExpiresAt = null;

    await user.save();

    const delivery = await sendPasswordResetOtp({
      method,
      email: user.email,
      mobile: user.mobile,
      otp,
      userName: user.name,
    });

    res.json({
      success: true,
      message: `OTP sent to your ${method}`,
      deliveryTarget: delivery.deliveryTarget,
    });
  } catch (err) {
    console.error("PASSWORD RESET OTP REQUEST ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to send password reset OTP",
    });
  }
};

export const verifyPasswordResetOtp = async (req, res) => {
  try {
    const { method, email, mobile, otp } = req.body;
    const query = getPasswordResetQuery({ method, email, mobile });

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Choose email or mobile for password reset",
      });
    }

    if (!isValidOtp(String(otp || "").trim())) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 6-digit OTP",
      });
    }

    const user = await User.findOne(query).select(PASSWORD_RESET_SELECT);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          method === "email"
            ? "Email is not registered"
            : "Mobile number is not registered",
      });
    }

    if (
      !user.passwordResetOtpHash ||
      !user.passwordResetOtpExpiresAt ||
      user.passwordResetMethod !== method ||
      user.passwordResetTarget !== getPasswordResetTarget({ method, email, mobile })
    ) {
      return res.status(400).json({
        success: false,
        message: "Request a new OTP first",
      });
    }

    if (user.passwordResetOtpExpiresAt.getTime() < Date.now()) {
      clearPasswordResetState(user);
      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new one.",
      });
    }

    if (hashValue(String(otp).trim()) !== user.passwordResetOtpHash) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpiresAt = null;
    user.passwordResetMethod = null;
    user.passwordResetTarget = null;
    user.passwordResetSessionHash = hashValue(resetToken);
    user.passwordResetSessionExpiresAt = new Date(
      Date.now() + PASSWORD_RESET_SESSION_WINDOW_MS
    );

    await user.save();

    res.json({
      success: true,
      message: "OTP verified successfully",
      resetToken,
      mobile: user.mobile,
    });
  } catch (err) {
    console.error("PASSWORD RESET OTP VERIFY ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to verify OTP",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required",
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const user = await User.findOne({
      passwordResetSessionHash: hashValue(resetToken),
    }).select(PASSWORD_RESET_SELECT);

    if (!user || !user.passwordResetSessionExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "Reset session not found. Verify OTP again.",
      });
    }

    if (user.passwordResetSessionExpiresAt.getTime() < Date.now()) {
      clearPasswordResetState(user);
      await user.save();

      return res.status(400).json({
        success: false,
        message: "Reset session expired. Verify OTP again.",
      });
    }

    user.password = newPassword;
    clearPasswordResetState(user);

    await user.save();

    res.json({
      success: true,
      message: "Password updated successfully",
      user: {
        mobile: user.mobile,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("PASSWORD RESET ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to reset password",
    });
  }
};
