import express from "express";
import { getRecords, createRecord, deleteRecord } from "../controllers/recordController.js";

const router = express.Router();

router.get("/:userId", getRecords);
router.post("/", createRecord);
router.delete("/:recordId", deleteRecord);

export default router;