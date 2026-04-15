import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockReq,
  createMockRes,
  mockBooking,
  mockTicket,
  mockUser,
} from "../../test/setup.js";

vi.mock("../../models/Booking.js", () => ({
  default: {
    getBookingById: vi.fn(),
  },
}));

vi.mock("../../models/Ticket.js", () => ({
  default: {
    generateTicketsForBooking: vi.fn(),
    getBookingTicketsSummary: vi.fn(),
    getTicketByCode: vi.fn(),
    checkInTicket: vi.fn(),
  },
}));

const { default: Booking } = await import("../../models/Booking.js");
const { default: Ticket } = await import("../../models/Ticket.js");
const ticketController = (await import("../ticketController.js")).default;

describe("ticket controller", () => {
  beforeEach(() => {
    Booking.getBookingById.mockResolvedValue(mockBooking());
    Ticket.getBookingTicketsSummary.mockResolvedValue({
      booking: {
        id: "booking-1",
        status: "confirmed",
        payment_status: "paid",
      },
      event: mockTicket().event,
      tickets: [mockTicket()],
    });
    Ticket.generateTicketsForBooking.mockResolvedValue({ created: false, tickets: [] });
    Ticket.getTicketByCode.mockResolvedValue(mockTicket());
    Ticket.checkInTicket.mockResolvedValue({
      ticket_code: "SEM-TEST123",
      status: "used",
      checked_in_at: new Date("2026-04-14T10:30:00.000Z"),
    });
  });

  it("returns 409 when booking is not confirmed", async () => {
    Booking.getBookingById.mockResolvedValue(
      mockBooking({ status: "pending_payment", payment_status: "unpaid" })
    );
    const req = createMockReq({
      params: { id: "booking-1" },
      user: mockUser(),
    });
    const res = createMockRes();

    await ticketController.getBookingTickets(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Tickets are available only for confirmed bookings",
    });
  });

  it("allows booking owner to view tickets", async () => {
    const req = createMockReq({
      params: { id: "booking-1" },
      user: mockUser({ id: "user-1" }),
    });
    const res = createMockRes();

    await ticketController.getBookingTickets(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Tickets retrieved successfully",
      })
    );
  });

  it("blocks another attendee from viewing booking tickets", async () => {
    const req = createMockReq({
      params: { id: "booking-1" },
      user: mockUser({ id: "user-2" }),
    });
    const res = createMockRes();

    await ticketController.getBookingTickets(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("allows organizer to validate ticket for own event", async () => {
    const req = createMockReq({
      params: { ticket_code: "SEM-TEST123" },
      user: mockUser({ id: "organizer-1", role: "organizer" }),
    });
    const res = createMockRes();

    await ticketController.getTicketByCode(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(Ticket.checkInTicket).not.toHaveBeenCalled();
  });

  it("blocks organizer from validating another organizer event ticket", async () => {
    const req = createMockReq({
      params: { ticket_code: "SEM-TEST123" },
      user: mockUser({ id: "organizer-2", role: "organizer" }),
    });
    const res = createMockRes();

    await ticketController.getTicketByCode(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("checks in a valid ticket and returns updated status", async () => {
    const req = createMockReq({
      params: { ticket_code: "SEM-TEST123" },
      user: mockUser({ id: "organizer-1", role: "organizer" }),
    });
    const res = createMockRes();

    await ticketController.checkInTicket(req, res);

    expect(Ticket.checkInTicket).toHaveBeenCalledWith("SEM-TEST123");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Ticket checked in successfully",
        data: expect.objectContaining({
          ticket_code: "SEM-TEST123",
          status: "used",
        }),
      })
    );
  });

  it("returns 400 for cancelled ticket check-in", async () => {
    Ticket.getTicketByCode.mockResolvedValue(mockTicket({ status: "cancelled" }));
    const req = createMockReq({
      params: { ticket_code: "SEM-TEST123" },
      user: mockUser({ id: "organizer-1", role: "organizer" }),
    });
    const res = createMockRes();

    await ticketController.checkInTicket(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Ticket.checkInTicket).not.toHaveBeenCalled();
  });

  it("returns 409 for already used ticket check-in", async () => {
    Ticket.getTicketByCode.mockResolvedValue(mockTicket({ status: "used" }));
    const req = createMockReq({
      params: { ticket_code: "SEM-TEST123" },
      user: mockUser({ id: "organizer-1", role: "organizer" }),
    });
    const res = createMockRes();

    await ticketController.checkInTicket(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(Ticket.checkInTicket).not.toHaveBeenCalled();
  });
});
