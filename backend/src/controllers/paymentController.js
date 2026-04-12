import Booking from "../models/Booking.js";
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
    logWebhook({ event, bookingId: booking.id, action: "failed_validation" });
    return;
  }

  if (booking.status === "confirmed") {
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

  const expectedAmount = getExpectedAmountInCents(booking.event.price);
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
    logWebhook({ event, bookingId: booking.id, action: "failed_validation" });
    return;
  }

  const confirmedBookings = await Booking.countConfirmedBookingsForEvent(
    booking.event_id
  );

  if (confirmedBookings >= booking.event.capacity) {
    await Booking.failPayment(booking.id, {
      stripe_event_id: event.id,
      stripe_payment_intent_id: session.payment_intent,
      amount_paid: paidAmount / 100,
      currency: paidCurrency
    });
    logWebhook({ event, bookingId: booking.id, action: "failed_full" });
    return;
  }

  await Booking.confirmPaidBooking(booking.id, {
    stripe_event_id: event.id,
    stripe_payment_intent_id: session.payment_intent,
    amount_paid: paidAmount / 100,
    currency: paidCurrency
  });
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

