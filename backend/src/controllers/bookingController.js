import Booking from "../models/Booking.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import {
  createBookingCheckoutSession,
  getPaymentCurrency
} from "../utils/stripe.js";

const isPaidEvent = (event) => Number(event.price) > 0;

const buildBookingResponse = ({ booking, paymentRequired, checkoutUrl }) => {
  const response = {
    booking,
    payment_required: paymentRequired,
  };

  if (checkoutUrl) {
    response.payment = {
      provider: "stripe",
      checkout_url: checkoutUrl,
    };
  }

  return response;
};

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

    if (existingBooking?.status === "confirmed") {
      return res.status(409).json({
        success: false,
        message: "You have already booked this event"
      });
    }

    if (existingBooking?.status === "pending_payment") {
      return res.status(409).json({
        success: false,
        message: "You already have a pending payment for this event"
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
    const paidEvent = isPaidEvent(event);
    const nextStatus = paidEvent ? "pending_payment" : "confirmed";
    const nextPaymentStatus = paidEvent ? "unpaid" : "paid";
    const nextAmountPaid = paidEvent ? null : 0;

    if (existingBooking && existingBooking.status === "cancelled") {
      booking = await Booking.reactivateBooking(existingBooking.id, {
        status: nextStatus,
        payment_status: nextPaymentStatus,
        amount_paid: nextAmountPaid,
      });
    } else {
      booking = await Booking.createBookingWithStatus({
        user_id: req.user.id,
        event_id,
        status: nextStatus,
        payment_status: nextPaymentStatus,
        amount_paid: nextAmountPaid,
      });
    }

    if (paidEvent) {
      const user = await User.findUserById(req.user.id);
      let checkoutSession;

      try {
        checkoutSession = await createBookingCheckoutSession({
          booking,
          event,
          user,
        });
      } catch (error) {
        await Booking.failPayment(booking.id, {
          stripe_event_id: null,
          stripe_payment_intent_id: null,
          amount_paid: null,
          currency: getPaymentCurrency(),
        });
        throw error;
      }

      booking = await Booking.updateCheckoutSession(
        booking.id,
        checkoutSession.id
      );

      return res.status(201).json({
        success: true,
        message: "Payment required to confirm booking",
        data: buildBookingResponse({
          booking,
          paymentRequired: true,
          checkoutUrl: checkoutSession.url,
        }),
      });
    }

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: buildBookingResponse({
        booking,
        paymentRequired: false,
      }),
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

const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.getBookingSummaryById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    if (req.user.role !== "attendee" && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions"
      });
    }

    if (booking.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own bookings"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking retrieved successfully",
      data: booking
    });
  } catch (error) {
    console.error("Get booking by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching booking",
      error: error.message
    });
  }
};

export default {
  createBooking,
  cancelBooking,
  getMyBookings,
  getBookingById
};
