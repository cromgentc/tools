import express from "express";
import {
  getMetadata,
  saveMetadata
} from "../controllers/metadataController.js";

const router = express.Router();

// 📊 GET metadata (user wise)
router.get("/:userId", getMetadata);

// 💾 SAVE metadata (user wise)
router.post("/save", saveMetadata);

export default router;