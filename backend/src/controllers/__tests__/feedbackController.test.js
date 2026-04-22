import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockReq,
  createMockRes,
  mockEvent,
  mockUser,
} from "../../test/setup.js";

vi.mock("../../models/Feedback.js", () => ({
  default: {
    getEventById: vi.fn(),
    getConfirmedBooking: vi.fn(),
    upsertFeedback: vi.fn(),
    getFeedbacksByEvent: vi.fn(),
  },
}));

const { default: Feedback } = await import("../../models/Feedback.js");
const feedbackController = (await import("../feedbackController.js")).default;

describe("feedback controller", () => {
  beforeEach(() => {
    Feedback.getEventById.mockResolvedValue(
      mockEvent({
        id: "event-1",
        event_date: new Date("2026-04-10T10:00:00.000Z"),
        organizer_id: "organizer-1",
      })
    );
    Feedback.getConfirmedBooking.mockResolvedValue({ id: "booking-1" });
    Feedback.upsertFeedback.mockResolvedValue({
      id: "feedback-1",
      user_id: "user-1",
      event_id: "event-1",
      rating: 5,
      comment: "Great event",
      created_at: new Date("2026-04-12T10:00:00.000Z"),
    });
    Feedback.getFeedbacksByEvent.mockResolvedValue([
      {
        id: "feedback-1",
        rating: 4,
        comment: "Very useful",
        created_at: new Date("2026-04-12T10:00:00.000Z"),
        user: {
          first_name: "John",
          last_name: "Doe",
        },
      },
      {
        id: "feedback-2",
        rating: 5,
        comment: "Excellent",
        created_at: new Date("2026-04-13T10:00:00.000Z"),
        user: {
          first_name: "Jane",
          last_name: "Doe",
        },
      },
    ]);
  });

  it("returns 404 when submitting feedback for a missing event", async () => {
    Feedback.getEventById.mockResolvedValue(null);
    const req = createMockReq({
      params: { id: "event-1" },
      body: { rating: 5, comment: "Great" },
      user: mockUser({ role: "attendee" }),
    });
    const res = createMockRes();

    await feedbackController.submitFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Event not found",
    });
  });

  it("returns 400 when the event is not finished", async () => {
    Feedback.getEventById.mockResolvedValue(
      mockEvent({
        id: "event-1",
        event_date: new Date(Date.now() + 60 * 60 * 1000),
      })
    );
    const req = createMockReq({
      params: { id: "event-1" },
      body: { rating: 5 },
      user: mockUser({ role: "attendee" }),
    });
    const res = createMockRes();

    await feedbackController.submitFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Feedback can only be submitted after the event has finished",
    });
  });

  it("returns 400 for invalid rating", async () => {
    const req = createMockReq({
      params: { id: "event-1" },
      body: { rating: 8 },
      user: mockUser({ role: "attendee" }),
    });
    const res = createMockRes();

    await feedbackController.submitFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Rating must be an integer between 1 and 5",
    });
  });

  it("returns 403 when attendee has no confirmed booking", async () => {
    Feedback.getConfirmedBooking.mockResolvedValue(null);
    const req = createMockReq({
      params: { id: "event-1" },
      body: { rating: 4 },
      user: mockUser({ role: "attendee" }),
    });
    const res = createMockRes();

    await feedbackController.submitFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Access denied. Confirmed attendance is required to submit feedback",
    });
  });

  it("allows attendee with confirmed booking to upsert feedback", async () => {
    const req = createMockReq({
      params: { id: "event-1" },
      body: { rating: 5, comment: "Great event" },
      user: mockUser({ id: "user-1", role: "attendee" }),
    });
    const res = createMockRes();

    await feedbackController.submitFeedback(req, res);

    expect(Feedback.upsertFeedback).toHaveBeenCalledWith({
      user_id: "user-1",
      event_id: "event-1",
      rating: 5,
      comment: "Great event",
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Feedback submitted successfully",
      data: expect.objectContaining({
        id: "feedback-1",
        rating: 5,
      }),
    });
  });

  it("blocks organizer from reading feedback for another organizer event", async () => {
    const req = createMockReq({
      params: { id: "event-1" },
      user: mockUser({ id: "organizer-2", role: "organizer" }),
    });
    const res = createMockRes();

    await feedbackController.getEventFeedbackStats(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Access denied. You can only view feedback for your own events",
    });
  });

  it("allows organizer to read own event feedback", async () => {
    const req = createMockReq({
      params: { id: "event-1" },
      user: mockUser({ id: "organizer-1", role: "organizer" }),
    });
    const res = createMockRes();

    await feedbackController.getEventFeedbackStats(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Event feedback retrieved successfully",
      data: {
        average_rating: 4.5,
        total_reviews: 2,
        feedbacks: expect.any(Array),
      },
    });
  });

  it("allows admin to read any event feedback", async () => {
    const req = createMockReq({
      params: { id: "event-1" },
      user: mockUser({ id: "admin-1", role: "admin" }),
    });
    const res = createMockRes();

    await feedbackController.getEventFeedbackStats(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(Feedback.getFeedbacksByEvent).toHaveBeenCalledWith("event-1");
  });

  it("returns empty stats in standard response shape", async () => {
    Feedback.getFeedbacksByEvent.mockResolvedValue([]);
    const req = createMockReq({
      params: { id: "event-1" },
      user: mockUser({ id: "organizer-1", role: "organizer" }),
    });
    const res = createMockRes();

    await feedbackController.getEventFeedbackStats(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Event feedback retrieved successfully",
      data: {
        average_rating: 0,
        total_reviews: 0,
        feedbacks: [],
      },
    });
  });
});
