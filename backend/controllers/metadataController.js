import Metadata from "../models/Metadata.js";

// =========================
// GET METADATA
// =========================
export const getMetadata = async (req, res) => {
  try {
    const { userId } = req.params;

    // ===== VALIDATION =====
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: "User ID is required" 
      });
    }

    const metadata = await Metadata.findOne({ userId });

    if (!metadata) {
      return res.json({
        success: true,
        message: "No metadata found",
        metadata: {},
      });
    }

    res.json({
      success: true,
      metadata,
    });

  } catch (err) {
    console.error("GET METADATA ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to fetch metadata" 
    });
  }
};

// =========================
// SAVE / UPDATE METADATA
// =========================
export const saveMetadata = async (req, res) => {
  try {
    const { userId } = req.body;

    // ===== VALIDATION =====
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: "User ID is required" 
      });
    }

    // Find or create and update
    const metadata = await Metadata.findOneAndUpdate(
      { userId },
      { ...req.body, updatedAt: new Date() },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Metadata saved successfully",
      metadata,
    });

  } catch (err) {
    console.error("SAVE METADATA ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to save metadata" 
    });
  }
};