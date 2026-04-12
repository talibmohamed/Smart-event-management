import "dotenv/config";
import Stripe from "stripe";

const DEFAULT_CURRENCY = "eur";

let stripeClient;

export function getStripe() {
  if (stripeClient) {
    return stripeClient;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }

  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);

  return stripeClient;
}

export function getPaymentCurrency() {
  return (process.env.STRIPE_CURRENCY || DEFAULT_CURRENCY).toLowerCase();
}

export function getExpectedAmountInCents(price) {
  return Math.round(Number(price) * 100);
}

export async function createBookingCheckoutSession({ booking, event, user }) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const currency = getPaymentCurrency();
  const stripe = getStripe();

  return stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: getExpectedAmountInCents(event.price),
          product_data: {
            name: event.title,
            description: event.category || "Smart Event Management event"
          }
        }
      }
    ],
    metadata: {
      booking_id: booking.id,
      user_id: user.id,
      event_id: event.id
    },
    customer_email: user?.email,
    success_url: `${frontendUrl}/bookings/${booking.id}/payment-success`,
    cancel_url: `${frontendUrl}/bookings/${booking.id}/payment-cancelled`
  });
}

export function constructStripeWebhookEvent(rawBody, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  }

  return getStripe().webhooks.constructEvent(
    rawBody,
    signature,
    webhookSecret
  );
}
