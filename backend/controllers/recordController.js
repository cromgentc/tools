import Record from "../models/Record.js";

// =========================
// GET RECORDS BY USER
// =========================
export const getRecords = async (req, res) => {
  try {
    const { userId } = req.params;

    // ===== VALIDATION =====
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: "User ID is required" 
      });
    }

    const records = await Record.find({ userId })
      .populate("userId", "name mobile email")
      .sort({ createdAt: -1 });

    if (!records || records.length === 0) {
      return res.json({
        success: true,
        count: 0,
        message: "No records found",
        records: [],
      });
    }

    res.json({
      success: true,
      count: records.length,
      records,
    });

  } catch (err) {
    console.error("GET RECORDS ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to fetch records" 
    });
  }
};

// =========================
// CREATE RECORD
// =========================
export const createRecord = async (req, res) => {
  try {
    const { userId, data } = req.body;

    // ===== VALIDATION =====
    if (!userId || !data) {
      return res.status(400).json({ 
        success: false,
        message: "User ID and data are required" 
      });
    }

    const record = await Record.create({
      userId,
      data,
      createdAt: new Date(),
    });

    res.json({
      success: true,
      message: "Record created successfully",
      record,
    });

  } catch (err) {
    console.error("CREATE RECORD ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to create record" 
    });
  }
};

// =========================
// DELETE RECORD
// =========================
export const deleteRecord = async (req, res) => {
  try {
    const { recordId } = req.params;

    // ===== VALIDATION =====
    if (!recordId) {
      return res.status(400).json({ 
        success: false,
        message: "Record ID is required" 
      });
    }

    const deleted = await Record.findByIdAndDelete(recordId);

    if (!deleted) {
      return res.status(404).json({ 
        success: false,
        message: "Record not found" 
      });
    }

    res.json({
      success: true,
      message: "Record deleted successfully",
    });

  } catch (err) {
    console.error("DELETE RECORD ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to delete record" 
    });
  }
};