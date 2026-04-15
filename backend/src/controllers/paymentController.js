import Booking from "../models/Booking.js";
import Ticket from "../models/Ticket.js";
import { sendEmailBestEffort } from "../utils/emailService.js";
import {
  bookingConfirmedEmail,
  organizerBookingNotificationEmail,
  paymentExpiredEmail,
  paymentFailedEmail
} from "../utils/emailTemplates.js";
import { buildEmailTickets, getTicketUrl } from "../utils/ticketEmail.js";
import { buildTicketPdfAttachment } from "../utils/ticketPdf.js";
import {
  constructStripeWebhookEvent,
  getExpectedAmountInCents,
  getPaymentCurrency
} from "../utils/stripe.js";

const logWebhook = ({ event, bookingId, action }) => {
  console.log(
    JSON.stringify({
      scope: "stripe_webhook",
      event_type: event.type,
      stripe_event_id: event.id,
      booking_id: bookingId || null,
      action
    })
  );
};

const sendPaidBookingConfirmedEmails = async (bookingId) => {
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

const sendPaymentFailedEmail = async (bookingId, reason) => {
  const booking = await Booking.getBookingEmailContextById(bookingId);

  if (!booking) {
    return;
  }

  sendEmailBestEffort(
    paymentFailedEmail({
      attendee: booking.user,
      event: booking.event,
      reason
    })
  );
};

const sendPaymentExpiredEmail = async (bookingId) => {
  const booking = await Booking.getBookingEmailContextById(bookingId);

  if (!booking) {
    return;
  }

  sendEmailBestEffort(
    paymentExpiredEmail({
      attendee: booking.user,
      event: booking.event
    })
  );
};

const handleCheckoutCompleted = async (event) => {
  const session = event.data.object;
  const { booking_id, user_id, event_id } = session.metadata || {};

  if (!booking_id || !user_id || !event_id) {
    logWebhook({ event, action: "ignored_invalid_metadata" });
    return;
  }

  const booking = await Booking.getBookingWithEventById(booking_id);

  if (!booking) {
    logWebhook({ event, bookingId: booking_id, action: "ignored_missing_booking" });
    return;
  }

  if (booking.stripe_event_id === event.id) {
    if (booking.status === "confirmed") {
      await Ticket.generateTicketsForBooking(booking.id);
    }
    logWebhook({ event, bookingId: booking.id, action: "ignored_duplicate" });
    return;
  }

  if (
    booking.user_id !== user_id ||
    booking.event_id !== event_id ||
    booking.stripe_checkout_session_id !== session.id
  ) {
    await Booking.failPayment(booking.id, {
      stripe_event_id: event.id,
      amount_paid: session.amount_total ? session.amount_total / 100 : null,
      currency: session.currency || getPaymentCurrency()
    });
    await sendPaymentFailedEmail(booking.id, "Payment validation failed");
    logWebhook({ event, bookingId: booking.id, action: "failed_validation" });
    return;
  }

  if (booking.status === "confirmed") {
    await Ticket.generateTicketsForBooking(booking.id);
    await Booking.markStripeEventProcessed(booking.id, event.id);
    logWebhook({ event, bookingId: booking.id, action: "ignored_confirmed" });
    return;
  }

  if (booking.status !== "pending_payment") {
    await Booking.markStripeEventProcessed(booking.id, event.id);
    logWebhook({
      event,
      bookingId: booking.id,
      action: "ignored_invalid_state"
    });
    return;
  }

  const expectedAmount = getExpectedAmountInCents(
    Booking.getBookingTotalAmount(booking)
  );
  const expectedCurrency = getPaymentCurrency();
  const paidAmount = Number(session.amount_total);
  const paidCurrency = String(session.currency || "").toLowerCase();

  if (paidAmount !== expectedAmount || paidCurrency !== expectedCurrency) {
    await Booking.failPayment(booking.id, {
      stripe_event_id: event.id,
      stripe_payment_intent_id: session.payment_intent,
      amount_paid: Number.isNaN(paidAmount) ? null : paidAmount / 100,
      currency: paidCurrency || expectedCurrency
    });
    await sendPaymentFailedEmail(booking.id, "Payment amount or currency did not match the event price");
    logWebhook({ event, bookingId: booking.id, action: "failed_validation" });
    return;
  }

  const hasCapacity = await Booking.canConfirmPendingBookingCapacity(booking);

  if (!hasCapacity) {
    await Booking.failPayment(booking.id, {
      stripe_event_id: event.id,
      stripe_payment_intent_id: session.payment_intent,
      amount_paid: paidAmount / 100,
      currency: paidCurrency
    });
    await sendPaymentFailedEmail(booking.id, "The event became full before payment confirmation");
    logWebhook({ event, bookingId: booking.id, action: "failed_full" });
    return;
  }

  await Booking.confirmPaidBooking(booking.id, {
    stripe_event_id: event.id,
    stripe_payment_intent_id: session.payment_intent,
    amount_paid: paidAmount / 100,
    currency: paidCurrency
  });
  await Ticket.generateTicketsForBooking(booking.id);
  await sendPaidBookingConfirmedEmails(booking.id);
  logWebhook({ event, bookingId: booking.id, action: "confirmed" });
};

const handleCheckoutExpired = async (event) => {
  const session = event.data.object;
  const { booking_id } = session.metadata || {};

  if (!booking_id) {
    logWebhook({ event, action: "ignored_invalid_metadata" });
    return;
  }

  const booking = await Booking.getBookingById(booking_id);

  if (!booking) {
    logWebhook({ event, bookingId: booking_id, action: "ignored_missing_booking" });
    return;
  }

  if (booking.stripe_event_id === event.id) {
    logWebhook({ event, bookingId: booking.id, action: "ignored_duplicate" });
    return;
  }

  if (booking.status !== "pending_payment") {
    await Booking.markStripeEventProcessed(booking.id, event.id);
    logWebhook({
      event,
      bookingId: booking.id,
      action: "ignored_invalid_state"
    });
    return;
  }

  await Booking.expirePayment(booking.id, event.id);
  await sendPaymentExpiredEmail(booking.id);
  logWebhook({ event, bookingId: booking.id, action: "expired" });
};

const handleStripeWebhook = async (req, res) => {
  let event;

  try {
    event = constructStripeWebhookEvent(
      req.body,
      req.headers["stripe-signature"]
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid Stripe webhook signature"
    });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event);
    } else if (event.type === "checkout.session.expired") {
      await handleCheckoutExpired(event);
    } else {
      logWebhook({ event, action: "ignored_event_type" });
    }

    return res.status(200).json({
      success: true,
      message: "Stripe webhook processed"
    });
  } catch (error) {
    console.error("Stripe webhook error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while processing Stripe webhook",
      error: error.message
    });
  }
};

export default {
  handleStripeWebhook
};
