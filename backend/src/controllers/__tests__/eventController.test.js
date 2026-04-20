import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockReq,
  createMockRes,
  mockEvent,
  mockUser,
} from "../../test/setup.js";

vi.mock("../../models/Event.js", () => ({
  default: {
    getEventRecordById: vi.fn(),
  },
}));

vi.mock("../../models/Booking.js", () => ({
  default: {
    getEventAttendees: vi.fn(),
  },
}));

vi.mock("../../utils/geocoder.js", () => ({
  geocodeFrenchAddress: vi.fn(),
}));

vi.mock("../../utils/eventImageStorage.js", () => ({
  deleteEventImage: vi.fn(),
  uploadEventImage: vi.fn(),
}));

vi.mock("../../utils/emailService.js", () => ({
  sendEmailBestEffort: vi.fn(),
}));

vi.mock("../../services/notificationService.js", () => ({
  default: {
    notifyEventUpdated: vi.fn(),
    notifyEventDeleted: vi.fn(),
  },
}));

vi.mock("../../utils/frenchCities.js", () => ({
  findSupportedFrenchCity: vi.fn(),
}));

const { default: Event } = await import("../../models/Event.js");
const { default: Booking } = await import("../../models/Booking.js");
const eventController = (await import("../eventController.js")).default;

const attendeeList = [
  {
    booking_id: "booking-1",
    booking_date: new Date("2026-04-13T10:00:00.000Z"),
    status: "confirmed",
    payment_status: "paid",
    total_quantity: 2,
    total_price: "50.00",
    attendee: {
      id: "user-1",
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
    },
    items: [
      {
        ticket_tier_id: "tier-1",
        ticket_tier_name: "VIP",
        quantity: 2,
        unit_price: "25.00",
        total_price: "50.00",
      },
    ],
  },
];

describe("event controller attendees", () => {
  beforeEach(() => {
    Event.getEventRecordById.mockResolvedValue(
      mockEvent({
        id: "event-1",
        title: "Tech Conference",
        organizer_id: "organizer-1",
      })
    );
    Booking.getEventAttendees.mockResolvedValue(attendeeList);
  });

  it("returns 404 when event is not found", async () => {
    Event.getEventRecordById.mockResolvedValue(null);
    const req = createMockReq({
      params: { id: "event-1" },
      user: mockUser({ id: "organizer-1", role: "organizer" }),
    });
    const res = createMockRes();

    await eventController.getEventAttendees(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Event not found",
    });
  });

  it("blocks organizer from viewing another organizer's attendees", async () => {
    const req = createMockReq({
      params: { id: "event-1" },
      user: mockUser({ id: "other-organizer", role: "organizer" }),
    });
    const res = createMockRes();

    await eventController.getEventAttendees(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Access denied. You can only view attendees for your own events",
    });
  });

  it("allows organizer to view own attendees with confirmed default filter", async () => {
    const req = createMockReq({
      params: { id: "event-1" },
      user: mockUser({ id: "organizer-1", role: "organizer" }),
    });
    const res = createMockRes();

    await eventController.getEventAttendees(req, res);

    expect(Booking.getEventAttendees).toHaveBeenCalledWith({
      event_id: "event-1",
      status: "confirmed",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Event attendees retrieved successfully",
      data: {
        event: {
          id: "event-1",
          title: "Tech Conference",
          status_filter: "confirmed",
        },
        attendees: attendeeList,
      },
    });
  });

  it("allows admin to view any event attendees", async () => {
    const req = createMockReq({
      params: { id: "event-1" },
      query: { status: "pending_payment" },
      user: mockUser({ id: "admin-1", role: "admin" }),
    });
    const res = createMockRes();

    await eventController.getEventAttendees(req, res);

    expect(Booking.getEventAttendees).toHaveBeenCalledWith({
      event_id: "event-1",
      status: "pending_payment",
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("supports status=all", async () => {
    const req = createMockReq({
      params: { id: "event-1" },
      query: { status: "all" },
      user: mockUser({ id: "organizer-1", role: "organizer" }),
    });
    const res = createMockRes();

    await eventController.getEventAttendees(req, res);

    expect(Booking.getEventAttendees).toHaveBeenCalledWith({
      event_id: "event-1",
      status: "all",
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 400 for invalid status filter", async () => {
    const req = createMockReq({
      params: { id: "event-1" },
      query: { status: "paid" },
      user: mockUser({ id: "organizer-1", role: "organizer" }),
    });
    const res = createMockRes();

    await eventController.getEventAttendees(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid attendee status filter",
    });
    expect(Booking.getEventAttendees).not.toHaveBeenCalled();
  });
});
