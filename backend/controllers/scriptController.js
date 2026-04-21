import Script from "../models/Script.js";
import User from "../models/User.js";
import xlsx from "xlsx";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ASSIGN SCRIPT
export const assignScript = async (req, res) => {
  try {
    const { mobile, email, content } = req.body;

    // ===== VALIDATION =====
    if (!mobile || !email || !content) {
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

    // Content validation (at least 10 chars)
    if (content.trim().length < 10) {
      return res.status(400).json({ message: "Script content must be at least 10 characters" });
    }

    // Find user by mobile
    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify email matches
    if (user.email !== email) {
      return res.status(400).json({ message: "Email does not match user's registered email" });
    }

    // Create script
    const script = await Script.create({
      userId: user._id,
      mobile,
      email,
      content: content.trim(),
      status: "pending",
    });

    res.json({ 
      success: true, 
      message: "Script assigned successfully",
      script: {
        scriptId: script._id,
        userId: script.userId,
        mobile: script.mobile,
        email: script.email,
      }
    });
  } catch (err) {
    console.error("ASSIGN SCRIPT ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to assign script" 
    });
  }
};

// GET NEXT SCRIPT
export const getUserScript = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId).select("accountStatus");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.accountStatus === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Please contact admin.",
      });
    }

    const script = await Script.findOne({
      userId,
      status: "pending",
    }).sort({ createdAt: 1 });

    if (!script) {
      return res.json({
        success: true,
        scriptId: null,
        content: "🎉 All scripts completed! Great work.",
        status: "completed",
      });
    }

    res.json({
      success: true,
      scriptId: script._id,
      content: script.content,
      status: "pending",
    });
  } catch (err) {
    console.error("GET USER SCRIPT ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to fetch script" 
    });
  }
};

// COMPLETE SCRIPT
export const completeScript = async (req, res) => {
  try {
    const { scriptId } = req.body;

    if (!scriptId) {
      return res.status(400).json({ message: "Script ID is required" });
    }

    const updated = await Script.findByIdAndUpdate(
      scriptId,
      { 
        status: "completed",
        completedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Script not found" });
    }

    res.json({ 
      success: true, 
      message: "Script completed successfully",
      script: updated,
    });
  } catch (err) {
    console.error("COMPLETE SCRIPT ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to complete script" 
    });
  }
};

// BULK UPLOAD (EXCEL)
export const bulkUploadScripts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return res.status(400).json({ message: "Excel file is empty or invalid format" });
    }

    const inserted = [];
    const errors = [];

    // Process each row
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const mobile = String(row.mobile || row.Mobile || "").trim();
      const email = String(row.email || row.Email || "").trim();
      const content = String(row.content || row.Content || row.script || row.Script || "").trim();

      try {
        // Validation
        if (!mobile || mobile.length !== 10 || !/^\d+$/.test(mobile)) {
          errors.push(`Row ${i + 1}: Invalid mobile number`);
          continue;
        }

        if (!email || !email.includes("@")) {
          errors.push(`Row ${i + 1}: Invalid email address`);
          continue;
        }

        if (!content || content.length < 10) {
          errors.push(`Row ${i + 1}: Script content too short (min 10 chars)`);
          continue;
        }

        // Find user
        const user = await User.findOne({ mobile });
        if (!user) {
          errors.push(`Row ${i + 1}: User with mobile ${mobile} not found`);
          continue;
        }

        // Verify email
        if (user.email.toLowerCase() !== email.toLowerCase()) {
          errors.push(`Row ${i + 1}: Email does not match user's registered email`);
          continue;
        }

        // Create script
        const script = await Script.create({
          userId: user._id,
          mobile,
          email: user.email,
          content,
          status: "pending",
        });

        inserted.push({
          mobile,
          email,
          scriptId: script._id,
          status: "Added",
        });

      } catch (rowErr) {
        errors.push(`Row ${i + 1}: ${rowErr.message}`);
      }
    }

    // Delete uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Bulk upload completed. ${inserted.length} scripts added, ${errors.length} errors`,
      inserted,
      errors: errors.slice(0, 10), // Return first 10 errors only
    });

  } catch (err) {
    console.error("BULK UPLOAD ERROR:", err);
    
    // Delete file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: err.message || "Failed to process bulk upload",
    });
  }
};
