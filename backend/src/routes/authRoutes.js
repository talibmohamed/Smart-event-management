import express from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import {
  forgotPasswordRateLimit,
  loginRateLimit,
  registerRateLimit,
  resetPasswordRateLimit,
} from "../middlewares/rateLimitMiddleware.js";

const router = express.Router();

router.post("/register", registerRateLimit, register);
router.post("/login", loginRateLimit, login);
router.post("/forgot-password", forgotPasswordRateLimit, forgotPassword);
router.post("/reset-password", resetPasswordRateLimit, resetPassword);
router.get("/me", protect, getMe);

export default router;
