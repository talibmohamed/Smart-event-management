import Booking from "../models/Booking.js";
import Event from "../models/Event.js";

const createBooking = async (req, res) => {
  try {
    const { event_id } = req.body;

    if (!event_id) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required"
      });
    }

    const event = await Event.getEventById(event_id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const existingBooking = await Booking.findBookingByUserAndEvent(req.user.id, event_id);

    if (existingBooking && existingBooking.status === "confirmed") {
      return res.status(409).json({
        success: false,
        message: "You have already booked this event"
      });
    }

    const confirmedBookings = await Booking.countConfirmedBookingsForEvent(event_id);

    if (confirmedBookings >= event.capacity) {
      return res.status(400).json({
        success: false,
        message: "This event is fully booked"
      });
    }

    let booking;

    if (existingBooking && existingBooking.status === "cancelled") {
      booking = await Booking.reactivateBooking(existingBooking.id);
    } else {
      booking = await Booking.createBooking({
        user_id: req.user.id,
        event_id
      });
    }

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking
    });
  } catch (error) {
    console.error("Create booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating booking",
      error: error.message
    });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    if (booking.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only cancel your own bookings"
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Booking is already cancelled"
      });
    }

    const updatedBooking = await Booking.cancelBooking(booking.id);

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: updatedBooking
    });
  } catch (error) {
    console.error("Cancel booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while cancelling booking",
      error: error.message
    });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.getMyBookings(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Bookings retrieved successfully",
      data: bookings
    });
  } catch (error) {
    console.error("Get my bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching bookings",
      error: error.message
    });
  }
};

export default {
  createBooking,
  cancelBooking,
  getMyBookings
};