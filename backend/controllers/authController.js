import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { serializeUserActivity, touchUserActivity } from "../utils/userActivity.js";

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// REGISTER
export const registerUser = async (req, res) => {
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

    // Check if user exists
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
      email: email.toLowerCase(),
      password 
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

    // ===== VALIDATION =====
    if (!mobile || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find user by mobile
    const user = await User.findOne({ mobile });

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
    const isPasswordValid = await user.matchPassword(password);
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
