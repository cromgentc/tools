import express from "express";
import {
  registerUser,
  loginUser,
  reportUserActivity,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/activity", reportUserActivity);
router.post("/forgot-password/request-otp", requestPasswordResetOtp);
router.post("/forgot-password/verify-otp", verifyPasswordResetOtp);
router.post("/forgot-password/reset", resetPassword);

export default router;
