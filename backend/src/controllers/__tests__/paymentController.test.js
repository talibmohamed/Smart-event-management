import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockReq, createMockRes, mockBooking } from "../../test/setup.js";

vi.mock("../../models/Booking.js", () => ({
  default: {
    getBookingWithEventById: vi.fn(),
    failPayment: vi.fn(),
    confirmPaidBooking: vi.fn(),
    markStripeEventProcessed: vi.fn(),
    canConfirmPendingBookingCapacity: vi.fn(),
    getBookingTotalAmount: vi.fn(),
    getBookingEmailContextById: vi.fn(),
    getBookingById: vi.fn(),
    expirePayment: vi.fn(),
  },
}));

vi.mock("../../models/Ticket.js", () => ({
  default: {
    generateTicketsForBooking: vi.fn(),
    getTicketsForBooking: vi.fn(),
  },
}));

vi.mock("../../utils/stripe.js", () => ({
  constructStripeWebhookEvent: vi.fn(),
  getExpectedAmountInCents: vi.fn((amount) => Math.round(Number(amount) * 100)),
  getPaymentCurrency: vi.fn(() => "eur"),
}));

vi.mock("../../utils/emailService.js", () => ({
  sendEmailBestEffort: vi.fn(),
}));

const { default: Booking } = await import("../../models/Booking.js");
const { default: Ticket } = await import("../../models/Ticket.js");
const { constructStripeWebhookEvent } = await import("../../utils/stripe.js");
const { sendEmailBestEffort } = await import("../../utils/emailService.js");
const paymentController = (await import("../paymentController.js")).default;

describe("payment controller", () => {
  beforeEach(() => {
    constructStripeWebhookEvent.mockReturnValue({
      id: "evt_duplicate",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          amount_total: 2500,
          currency: "eur",
          payment_intent: "pi_test_123",
          metadata: {
            booking_id: "booking-1",
            user_id: "user-1",
            event_id: "event-1",
          },
        },
      },
    });
    Booking.getBookingWithEventById.mockResolvedValue(
      mockBooking({
        status: "pending_payment",
        stripe_event_id: "evt_duplicate",
        stripe_checkout_session_id: "cs_test_123",
      })
    );
    Ticket.generateTicketsForBooking.mockResolvedValue({ created: true, tickets: [] });
    Ticket.getTicketsForBooking.mockResolvedValue([]);
  });

  it("ignores duplicate webhook event id without changing booking or sending email", async () => {
    const req = createMockReq({
      body: Buffer.from("{}"),
      headers: { "stripe-signature": "sig" },
    });
    const res = createMockRes();

    await paymentController.handleStripeWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Stripe webhook processed",
    });
    expect(Booking.confirmPaidBooking).not.toHaveBeenCalled();
    expect(Ticket.generateTicketsForBooking).not.toHaveBeenCalled();
    expect(Booking.failPayment).not.toHaveBeenCalled();
    expect(sendEmailBestEffort).not.toHaveBeenCalled();
  });
});
