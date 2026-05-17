import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

import {
  addVendor,
  addUser,
  bulkAddVendors,
  bulkAddUsers,
  deleteScript,
  deleteAllUserRecordings,
  deleteUser,
  deleteVendorReport,
  getAllScripts,
  getAllUsers,
  getAllVendors,
  getAdminSettings,
  getVendorReports,
  getStats,
  getUserDetails,
  downloadAllUserRecordings,
  downloadReportExcel,
  updateUserDetails,
  updateVendorReport,
  updateUserStatus,
  updateAdminSettings,
  updateVendor,
  updateUserVendor,
  shareVendorReport,
  uploadReportToGoogleSheet,
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

const reportUploadDir = path.resolve("uploads", "vendor-reports");

const reportStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(reportUploadDir)) {
      fs.mkdirSync(reportUploadDir, { recursive: true });
    }

    cb(null, reportUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const reportUpload = multer({
  storage: reportStorage,
  limits: {
    fileSize: 25 * 1024 * 1024,
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

const handleReportUpload = (req, res, next) => {
  reportUpload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: err.code === "LIMIT_FILE_SIZE" ? "Report file must be 25MB or smaller" : err.message,
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
router.get("/settings", getAdminSettings);
router.post("/settings", updateAdminSettings);
router.get("/report/download-excel", downloadReportExcel);
router.post("/report/upload-google-sheet", uploadReportToGoogleSheet);
router.get("/vendor-reports", getVendorReports);
router.post("/vendor-reports", handleReportUpload, shareVendorReport);
router.patch("/vendor-reports/:id", handleReportUpload, updateVendorReport);
router.delete("/vendor-reports/:id", deleteVendorReport);
router.get("/users", getAllUsers);
router.get("/user/:id/recordings/download", downloadAllUserRecordings);
router.get("/user/:id", getUserDetails);
router.patch("/user/:id", updateUserDetails);
router.patch("/user/:id/status", updateUserStatus);
router.patch("/user/:id/vendor", updateUserVendor);
router.delete("/user/:id/recordings", deleteAllUserRecordings);
router.delete("/user/:id", deleteUser);
router.get("/scripts", getAllScripts);
router.delete("/script/:id", deleteScript);

export default router;
