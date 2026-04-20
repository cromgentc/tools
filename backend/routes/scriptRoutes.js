import express from "express";
import multer from "multer";
import path from "path";
import {
  assignScript,
  getUserScript,
  completeScript,
  bulkUploadScripts,
} from "../controllers/scriptController.js";

const router = express.Router();

// ===== MULTER CONFIGURATION =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files (.xlsx, .xls, .csv) are allowed"));
    }
  },
});

// ===== ROUTES =====
router.post("/assign", assignScript);
router.get("/:userId", getUserScript);
router.post("/complete", completeScript);
router.post("/bulk-upload", upload.single("file"), bulkUploadScripts);

export default router;