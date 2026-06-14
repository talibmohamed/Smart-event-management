import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockReq, createMockRes, mockUser } from "../../test/setup.js";

vi.mock("../../models/Waitlist.js", () => ({
  default: {
    getEventAvailabilityRecord: vi.fn(),
    findActiveBookingForUser: vi.fn(),
    joinWaitlist: vi.fn(),
    leaveWaitlist: vi.fn(),
    getWaitlistStatus: vi.fn(),
  },
}));

const { default: Waitlist } = await import("../../models/Waitlist.js");
const waitlistController = (await import("../waitlistController.js")).default;

describe("waitlist controller", () => {
  beforeEach(() => {
    Waitlist.getEventAvailabilityRecord.mockResolvedValue({
      id: "event-1",
      title: "Sold out event",
      capacity: 50,
      remaining_seats: 0,
      is_full: true,
    });
    Waitlist.findActiveBookingForUser.mockResolvedValue(null);
    Waitlist.joinWaitlist.mockResolvedValue({
      id: "waitlist-1",
      event_id: "event-1",
      user_id: "user-1",
    });
    Waitlist.leaveWaitlist.mockResolvedValue({ count: 1 });
    Waitlist.getWaitlistStatus.mockResolvedValue({
      is_waiting: true,
      position: 2,
      total_waiting: 6,
    });
  });

  it("allows an attendee to join the waitlist for a full event", async () => {
    const req = createMockReq({
      params: { id: "event-1" },
      user: mockUser({ role: "attendee" }),
    });
    const res = createMockRes();

    await waitlistController.joinWaitlist(req, res);

    expect(Waitlist.joinWaitlist).toHaveBeenCalledWith({
      event_id: "event-1",
      user_id: "user-1",
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Joined waitlist successfully",
      data: {
        is_waiting: true,
        position: 2,
        total_waiting: 6,
      },
    });
  });

  it("rejects join when the event is not full", async () => {
    Waitlist.getEventAvailabilityRecord.mockResolvedValue({
      id: "event-1",
      capacity: 50,
      remaining_seats: 5,
      is_full: false,
    });
    const req = createMockReq({
      params: { id: "event-1" },
      user: mockUser({ role: "attendee" }),
    });
    const res = createMockRes();

    await waitlistController.joinWaitlist(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Event is not full",
    });
  });

  it("rejects non-attendee users", async () => {
    const req = createMockReq({
      params: { id: "event-1" },
      user: mockUser({ role: "organizer" }),
    });
    const res = createMockRes();

    await waitlistController.joinWaitlist(req, res);

    expect(Waitlist.getEventAvailabilityRecord).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Access denied. Only attendees can use the waitlist",
    });
  });

  it("rejects attendees with an active booking", async () => {
    Waitlist.findActiveBookingForUser.mockResolvedValue({
      id: "booking-1",
      status: "pending_payment",
    });
    const req = createMockReq({
      params: { id: "event-1" },
      user: mockUser({ role: "attendee" }),
    });
    const res = createMockRes();

    await waitlistController.joinWaitlist(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "An active booking already exists for this event",
    });
  });

  it("returns conflict for duplicate waitlist join", async () => {
    const error = new Error("duplicate");
    error.code = "P2002";
    Waitlist.joinWaitlist.mockRejectedValue(error);
    const req = createMockReq({
      params: { id: "event-1" },
      user: mockUser({ role: "attendee" }),
    });
    const res = createMockRes();

    await waitlistController.joinWaitlist(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "You are already on the waitlist for this event",
    });
  });

  it("lets an attendee leave the waitlist", async () => {
    const req = createMockReq({
      params: { id: "event-1" },
      user: mockUser({ role: "attendee" }),
    });
    const res = createMockRes();

    await waitlistController.leaveWaitlist(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Left waitlist successfully",
      data: {
        is_waiting: false,
        position: null,
      },
    });
  });

  it("returns 404 when leaving without a waitlist entry", async () => {
    Waitlist.leaveWaitlist.mockResolvedValue({ count: 0 });
    const req = createMockReq({
      params: { id: "event-1" },
      user: mockUser({ role: "attendee" }),
    });
    const res = createMockRes();

    await waitlistController.leaveWaitlist(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "You are not on the waitlist for this event",
    });
  });

  it("returns status for the current attendee", async () => {
    const req = createMockReq({
      params: { id: "event-1" },
      user: mockUser({ role: "attendee" }),
    });
    const res = createMockRes();

    await waitlistController.getMyWaitlistStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Waitlist status retrieved successfully",
      data: {
        is_waiting: true,
        position: 2,
        total_waiting: 6,
      },
    });
  });

  it("returns 404 when status is requested for a missing event", async () => {
    Waitlist.getEventAvailabilityRecord.mockResolvedValue(null);
    const req = createMockReq({
      params: { id: "event-1" },
      user: mockUser({ role: "attendee" }),
    });
    const res = createMockRes();

    await waitlistController.getMyWaitlistStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Event not found",
    });
  });
});
