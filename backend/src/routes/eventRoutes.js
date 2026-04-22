import express from "express";
import eventController from "../controllers/eventController.js";
import feedbackController from "../controllers/feedbackController.js"; // 👈 Nouvel import
import authMiddleware from "../middlewares/authMiddleware.js";
import eventImageUpload from "../middlewares/eventImageUpload.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.get("/", eventController.getAllEvents);
router.get(
  "/:id/attendees",
  authMiddleware,
  roleMiddleware("organizer", "admin"),
  eventController.getEventAttendees
);
router.get("/:id", eventController.getEventById);

// ==========================================
// NOUVELLES ROUTES POUR LES AVIS (FEEDBACK)
// ==========================================

// 1. Un participant laisse un avis sur l'événement
router.post(
  "/:id/feedback",
  authMiddleware, // Doit être connecté
  feedbackController.submitFeedback
);

// 2. L'organisateur récupère les statistiques des avis de son événement
router.get(
  "/:id/feedback",
  authMiddleware,
  roleMiddleware("organizer", "admin"), // Seul l'orga/admin peut voir le dashboard
  feedbackController.getEventFeedbackStats
);

// ==========================================

router.post(
  "/",
  authMiddleware,
  roleMiddleware("organizer", "admin"),
  eventImageUpload,
  eventController.createEvent
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("organizer", "admin"),
  eventImageUpload,
  eventController.updateEvent
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("organizer", "admin"),
  eventController.deleteEvent
);

export default router;