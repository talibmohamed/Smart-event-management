import express from "express";
import bookingController from "../controllers/bookingController.js";
import ticketController from "../controllers/ticketController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.get(
  "/my-bookings",
  authMiddleware,
  roleMiddleware("attendee"),
  bookingController.getMyBookings
);
router.get("/:id/tickets/pdf", authMiddleware, ticketController.getBookingTicketsPdf);
router.get("/:id/tickets", authMiddleware, ticketController.getBookingTickets);
router.get("/:id", authMiddleware, bookingController.getBookingById);
router.post(
  "/:id/retry-payment",
  authMiddleware,
  roleMiddleware("attendee"),
  bookingController.retryPayment
);
router.post(
  "/",
  authMiddleware,
  roleMiddleware("attendee"),
  bookingController.createBooking
);
router.put("/:id/cancel", authMiddleware, bookingController.cancelBooking);

export default router;
