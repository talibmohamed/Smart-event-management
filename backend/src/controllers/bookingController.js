import Booking from "../models/Booking.js";
import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import {
  createBookingCheckoutSession,
  getPaymentCurrency
} from "../utils/stripe.js";
import { sendEmailBestEffort } from "../utils/emailService.js";
import {
  bookingCancelledEmail,
  bookingConfirmedEmail,
  organizerBookingCancelledEmail,
  organizerBookingNotificationEmail
} from "../utils/emailTemplates.js";
import { buildEmailTickets, getTicketUrl } from "../utils/ticketEmail.js";
import { buildTicketPdfAttachment } from "../utils/ticketPdf.js";
import { parseBookingItems } from "../utils/ticketTiers.js";

const isPaidBooking = (totalAmount) => Number(totalAmount) > 0;

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

const sendBookingConfirmedEmails = async (bookingId) => {
  const booking = await Booking.getBookingEmailContextById(bookingId);

  if (!booking) {
    return;
  }

  const tickets = await Ticket.getTicketsForBooking(bookingId);
  const emailTicketData = await buildEmailTickets(tickets);
  const ticketPdfAttachment = await buildTicketPdfAttachment({
    booking,
    event: tickets[0]?.event || booking.event,
    tickets,
  });
  const attachments = [
    ...emailTicketData.attachments,
    ...(ticketPdfAttachment ? [ticketPdfAttachment] : []),
  ];

  sendEmailBestEffort(
    bookingConfirmedEmail({
      attendee: booking.user,
      event: booking.event,
      booking,
      ticketUrl: getTicketUrl(booking.id),
      tickets: emailTicketData.tickets,
      attachments: attachments.length ? attachments : undefined
    })
  );
  sendEmailBestEffort(
    organizerBookingNotificationEmail({
      organizer: booking.event.organizer,
      attendee: booking.user,
      event: booking.event,
      booking
    })
  );
};

const sendBookingCancelledEmails = async (booking) => {
  const context = await Booking.getBookingEmailContextById(booking.id);

  if (!context) {
    return;
  }

  sendEmailBestEffort(
    bookingCancelledEmail({
      attendee: context.user,
      event: context.event
    })
  );

  if (booking.status === "confirmed") {
    sendEmailBestEffort(
      organizerBookingCancelledEmail({
        organizer: context.event.organizer,
        attendee: context.user,
        event: context.event
      })
    );
  }
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

    const requestedItems = parseBookingItems(req.body.items);
    const preparedBooking = await Booking.prepareBookingItems({
      event,
      items: requestedItems,
    });

    let booking;
    const paidBooking = isPaidBooking(preparedBooking.totalAmount);
    const nextStatus = paidBooking ? "pending_payment" : "confirmed";
    const nextPaymentStatus = paidBooking ? "unpaid" : "paid";
    const nextAmountPaid = paidBooking ? null : preparedBooking.totalAmount;

    if (existingBooking && existingBooking.status === "cancelled") {
      booking = await Booking.reactivateBooking(existingBooking.id, {
        status: nextStatus,
        payment_status: nextPaymentStatus,
        amount_paid: nextAmountPaid,
        items: preparedBooking.items,
      });
    } else {
      booking = await Booking.createBookingWithStatus({
        user_id: req.user.id,
        event_id,
        status: nextStatus,
        payment_status: nextPaymentStatus,
        amount_paid: nextAmountPaid,
        items: preparedBooking.items,
      });
    }

    if (paidBooking) {
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

    await Ticket.generateTicketsForBooking(booking.id);
    await sendBookingConfirmedEmails(booking.id);

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

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

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
    await Ticket.cancelTicketsForBooking(booking.id);
    await sendBookingCancelledEmails(booking);

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

const retryPayment = async (req, res) => {
  try {
    const booking = await Booking.getBookingWithEventById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    if (req.user.role !== "attendee") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions"
      });
    }

    if (booking.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only retry payment for your own bookings"
      });
    }

    if (booking.status !== "pending_payment") {
      return res.status(400).json({
        success: false,
        message: "Only pending payment bookings can be retried"
      });
    }

    const hasCapacity = await Booking.canConfirmPendingBookingCapacity(booking);

    if (!hasCapacity) {
      return res.status(400).json({
        success: false,
        message: "This event is fully booked"
      });
    }

    const user = await User.findUserById(req.user.id);
    const checkoutSession = await createBookingCheckoutSession({
      booking,
      event: booking.event,
      user,
    });

    const updatedBooking = await Booking.updateCheckoutSession(
      booking.id,
      checkoutSession.id
    );

    return res.status(200).json({
      success: true,
      message: "Payment retry created successfully",
      data: buildBookingResponse({
        booking: updatedBooking,
        paymentRequired: true,
        checkoutUrl: checkoutSession.url,
      }),
    });
  } catch (error) {
    console.error("Retry payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while retrying payment",
      error: error.message
    });
  }
};

export default {
  createBooking,
  cancelBooking,
  getMyBookings,
  getBookingById,
  retryPayment
};
