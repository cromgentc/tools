import express from "express";

import {
  addUser,
  deleteScript,
  getAllScripts,
  getStats
} from "../controllers/adminController.js";

import { assignScript } from "../controllers/scriptController.js";

const router = express.Router();

router.post("/add-user", addUser);
router.get("/stats", getStats);



router.get("/scripts", getAllScripts);

router.delete("/script/:id", deleteScript);

export default router;