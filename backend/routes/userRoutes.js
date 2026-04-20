import express from "express";
import {
  loginUser,
  getNextScript,
  completeScript,
  addUser
} from "../controllers/userController.js";

const router = express.Router();

// 🔐 USER LOGIN
router.post("/login", loginUser);

// 📜 NEXT SCRIPT
router.get("/next-script", getNextScript);

// ✅ COMPLETE SCRIPT
router.post("/complete-script", completeScript);

// 👤 ADD USER (ADMIN USE)
router.post("/add-user", addUser);

export default router;