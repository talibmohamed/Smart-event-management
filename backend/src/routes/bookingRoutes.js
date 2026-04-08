import express from "express";
import bookingController from "../controllers/bookingController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/my-bookings", authMiddleware, bookingController.getMyBookings);
router.post("/", authMiddleware, bookingController.createBooking);
router.put("/:id/cancel", authMiddleware, bookingController.cancelBooking);

export default router;