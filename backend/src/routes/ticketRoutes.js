import express from "express";
import ticketController from "../controllers/ticketController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.get(
  "/:ticket_code",
  authMiddleware,
  roleMiddleware("organizer", "admin"),
  ticketController.getTicketByCode
);

router.post(
  "/:ticket_code/check-in",
  authMiddleware,
  roleMiddleware("organizer", "admin"),
  ticketController.checkInTicket
);

export default router;
