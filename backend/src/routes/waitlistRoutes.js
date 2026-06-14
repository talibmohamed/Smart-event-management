import express from "express";
import { joinWaitlist, leaveWaitlist, getWaitlistStatus } from "../controllers/waitlistController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Toutes les routes de la waitlist ont besoin d'être connecté (authMiddleware)
router.post("/:eventId/join", authMiddleware, joinWaitlist);
router.delete("/:eventId/leave", authMiddleware, leaveWaitlist);
router.get("/:eventId/status", authMiddleware, getWaitlistStatus);

export default router;