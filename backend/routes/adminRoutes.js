import express from "express";
import multer from "multer";
import path from "path";

import {
  addVendor,
  addUser,
  bulkAddVendors,
  bulkAddUsers,
  deleteScript,
  deleteAllUserRecordings,
  deleteUser,
  getAllScripts,
  getAllUsers,
  getAllVendors,
  getStats,
  getUserDetails,
  updateUserStatus,
  updateVendor,
  updateUserVendor,
} from "../controllers/adminController.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
      cb(null, true);
    } else {
      cb(new Error("Only Excel or CSV files (.xlsx, .xls, .csv) are allowed"));
    }
  },
});

const handleSpreadsheetUpload = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    next();
  });
};

router.post("/vendors", addVendor);
router.get("/vendors", getAllVendors);
router.patch("/vendor/:id", updateVendor);
router.post("/bulk-vendors", handleSpreadsheetUpload, bulkAddVendors);
router.post("/add-user", addUser);
router.post("/bulk-users", handleSpreadsheetUpload, bulkAddUsers);
router.get("/stats", getStats);
router.get("/users", getAllUsers);
router.get("/user/:id", getUserDetails);
router.patch("/user/:id/status", updateUserStatus);
router.patch("/user/:id/vendor", updateUserVendor);
router.delete("/user/:id/recordings", deleteAllUserRecordings);
router.delete("/user/:id", deleteUser);
router.get("/scripts", getAllScripts);
router.delete("/script/:id", deleteScript);

export default router;
