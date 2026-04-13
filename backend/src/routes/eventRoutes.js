import express from "express";
import eventController from "../controllers/eventController.js";
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
