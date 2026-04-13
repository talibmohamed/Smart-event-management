import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockReq,
  createMockRes,
  mockBooking,
  mockBookingItem,
  mockEvent,
  mockUser,
} from "../../test/setup.js";

vi.mock("../../models/Booking.js", () => ({
  default: {
    findBookingByUserAndEvent: vi.fn(),
    prepareBookingItems: vi.fn(),
    createBookingWithStatus: vi.fn(),
    reactivateBooking: vi.fn(),
    failPayment: vi.fn(),
    updateCheckoutSession: vi.fn(),
    getBookingEmailContextById: vi.fn(),
    getBookingWithEventById: vi.fn(),
    canConfirmPendingBookingCapacity: vi.fn(),
  },
}));

vi.mock("../../models/Event.js", () => ({
  default: {
    getEventById: vi.fn(),
  },
}));

vi.mock("../../models/User.js", () => ({
  default: {
    findUserById: vi.fn(),
  },
}));

vi.mock("../../utils/stripe.js", () => ({
  createBookingCheckoutSession: vi.fn(),
  getPaymentCurrency: vi.fn(() => "eur"),
}));

vi.mock("../../utils/emailService.js", () => ({
  sendEmailBestEffort: vi.fn(),
}));

const { default: Booking } = await import("../../models/Booking.js");
const { default: Event } = await import("../../models/Event.js");
const { default: User } = await import("../../models/User.js");
const {
  createBookingCheckoutSession,
} = await import("../../utils/stripe.js");
const bookingController = (await import("../bookingController.js")).default;

describe("booking controller", () => {
  beforeEach(() => {
    Event.getEventById.mockResolvedValue(mockEvent());
    Booking.findBookingByUserAndEvent.mockResolvedValue(null);
    Booking.prepareBookingItems.mockResolvedValue({
      items: [mockBookingItem()],
      totalQuantity: 1,
      totalAmount: 25,
    });
    Booking.createBookingWithStatus.mockResolvedValue(
      mockBooking({
        status: "pending_payment",
        payment_status: "unpaid",
        amount_paid: null,
        total_price: "25.00",
        items: [mockBookingItem()],
      })
    );
    Booking.updateCheckoutSession.mockResolvedValue(
      mockBooking({
        status: "pending_payment",
        payment_status: "unpaid",
        stripe_checkout_session_id: "cs_test_123",
        total_price: "25.00",
        items: [mockBookingItem()],
      })
    );
    Booking.getBookingEmailContextById.mockResolvedValue(null);
    User.findUserById.mockResolvedValue(mockUser());
    createBookingCheckoutSession.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/test",
    });
  });

  it("returns 400 when event_id is missing", async () => {
    const req = createMockReq({ body: {}, user: mockUser() });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Event ID is required",
    });
  });

  it("returns 404 when event is not found", async () => {
    Event.getEventById.mockResolvedValue(null);
    const req = createMockReq({
      body: { event_id: "event-1" },
      user: mockUser(),
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Event not found",
    });
  });

  it("returns 409 for duplicate confirmed booking", async () => {
    Booking.findBookingByUserAndEvent.mockResolvedValue(
      mockBooking({ status: "confirmed" })
    );
    const req = createMockReq({
      body: { event_id: "event-1" },
      user: mockUser(),
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "You have already booked this event",
    });
  });

  it("returns 409 for duplicate pending payment booking", async () => {
    Booking.findBookingByUserAndEvent.mockResolvedValue(
      mockBooking({ status: "pending_payment" })
    );
    const req = createMockReq({
      body: { event_id: "event-1" },
      user: mockUser(),
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "You already have a pending payment for this event",
    });
  });

  it("returns 400 for invalid booking item payload", async () => {
    const req = createMockReq({
      body: {
        event_id: "event-1",
        items: [{ ticket_tier_id: "tier-1", quantity: 6 }],
      },
      user: mockUser(),
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "You can book a maximum of 5 tickets per booking",
    });
    expect(Booking.prepareBookingItems).not.toHaveBeenCalled();
  });

  it("creates confirmed booking for free multi-tier total", async () => {
    const freeItems = [
      mockBookingItem({ ticket_tier_id: "tier-free", unit_price: "0.00", total_price: "0.00" }),
    ];
    Booking.prepareBookingItems.mockResolvedValue({
      items: freeItems,
      totalQuantity: 2,
      totalAmount: 0,
    });
    Booking.createBookingWithStatus.mockResolvedValue(
      mockBooking({
        status: "confirmed",
        payment_status: "paid",
        amount_paid: "0.00",
        total_quantity: 2,
        total_price: "0.00",
        items: freeItems,
      })
    );
    const req = createMockReq({
      body: {
        event_id: "event-1",
        items: [{ ticket_tier_id: "tier-free", quantity: 2 }],
      },
      user: mockUser(),
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(Booking.createBookingWithStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "confirmed",
        payment_status: "paid",
        amount_paid: 0,
        items: freeItems,
      })
    );
    expect(createBookingCheckoutSession).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Booking created successfully",
        data: expect.objectContaining({
          payment_required: false,
        }),
      })
    );
  });

  it("creates pending payment booking and checkout URL for paid multi-tier total", async () => {
    const req = createMockReq({
      body: {
        event_id: "event-1",
        items: [{ ticket_tier_id: "tier-1", quantity: 1 }],
      },
      user: mockUser(),
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(Booking.createBookingWithStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending_payment",
        payment_status: "unpaid",
        amount_paid: null,
      })
    );
    expect(createBookingCheckoutSession).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Payment required to confirm booking",
        data: expect.objectContaining({
          payment_required: true,
          payment: {
            provider: "stripe",
            checkout_url: "https://checkout.stripe.com/test",
          },
        }),
      })
    );
  });

  it("requires payment for mixed free and paid tiers when total is greater than 0", async () => {
    Booking.prepareBookingItems.mockResolvedValue({
      items: [
        mockBookingItem({
          ticket_tier_id: "tier-free",
          unit_price: "0.00",
          total_price: "0.00",
        }),
        mockBookingItem({
          id: "booking-item-2",
          ticket_tier_id: "tier-paid",
          unit_price: "15.00",
          total_price: "15.00",
        }),
      ],
      totalQuantity: 2,
      totalAmount: 15,
    });
    const req = createMockReq({
      body: {
        event_id: "event-1",
        items: [
          { ticket_tier_id: "tier-free", quantity: 1 },
          { ticket_tier_id: "tier-paid", quantity: 1 },
        ],
      },
      user: mockUser(),
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(Booking.createBookingWithStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending_payment",
        payment_status: "unpaid",
      })
    );
    expect(createBookingCheckoutSession).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payment_required: true,
        }),
      })
    );
  });

  it("marks payment failed when Stripe checkout creation fails", async () => {
    createBookingCheckoutSession.mockRejectedValue(new Error("stripe failed"));
    const req = createMockReq({
      body: { event_id: "event-1" },
      user: mockUser(),
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(Booking.failPayment).toHaveBeenCalledWith(
      "booking-1",
      expect.objectContaining({
        stripe_event_id: null,
        amount_paid: null,
        currency: "eur",
      })
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("retry payment checks owner, pending state, and capacity before checkout", async () => {
    Booking.getBookingWithEventById.mockResolvedValue(
      mockBooking({
        user_id: "user-1",
        status: "pending_payment",
        event: mockEvent(),
      })
    );
    Booking.canConfirmPendingBookingCapacity.mockResolvedValue(true);
    const req = createMockReq({
      params: { id: "booking-1" },
      user: mockUser({ id: "user-1" }),
    });
    const res = createMockRes();

    await bookingController.retryPayment(req, res);

    expect(Booking.canConfirmPendingBookingCapacity).toHaveBeenCalled();
    expect(createBookingCheckoutSession).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
