import express from "express";
import {
  registerUser,
  loginUser,
  reportUserActivity,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/activity", reportUserActivity);

export default router;
