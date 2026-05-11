import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockReq, createMockRes } from "../../test/setup.js";

vi.mock("../../models/AdminAnalytics.js", () => ({
  default: {
    getSummary: vi.fn(),
    getTimeseries: vi.fn(),
    getTopEvents: vi.fn(),
    getTopOrganizers: vi.fn(),
  },
}));

const { default: AdminAnalytics } = await import("../../models/AdminAnalytics.js");
const adminAnalyticsController = await import("../adminAnalyticsController.js");

describe("admin analytics controller", () => {
  beforeEach(() => {
    AdminAnalytics.getSummary.mockResolvedValue({
      users: { total: 10, newLast30Days: 2 },
      events: { total: 4, upcoming: 1, past: 3 },
      bookings: { total: 20, confirmed: 12, cancelled: 5, pendingPayment: 3 },
      revenue: { totalCents: 12500, currency: "eur", last30DaysCents: 4500 },
    });
    AdminAnalytics.getTimeseries.mockResolvedValue([
      { date: "2026-04-11", value: 1 },
      { date: "2026-04-12", value: 0 },
    ]);
    AdminAnalytics.getTopEvents.mockResolvedValue([
      {
        eventId: "event-1",
        title: "Top Event",
        organizerId: "organizer-1",
        organizerName: "Org One",
        eventDate: new Date("2026-04-20T10:00:00.000Z"),
        bookingsCount: 12,
        revenueCents: 12000,
        currency: "eur",
      },
    ]);
    AdminAnalytics.getTopOrganizers.mockResolvedValue([
      {
        organizerId: "organizer-1",
        name: "Org One",
        email: "org@example.com",
        eventsCount: 3,
        bookingsCount: 12,
        revenueCents: 12000,
        currency: "eur",
      },
    ]);
  });

  it("returns summary shape", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await adminAnalyticsController.getSummary(req, res);

    expect(AdminAnalytics.getSummary).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Analytics summary retrieved successfully",
      data: expect.objectContaining({
        revenue: { totalCents: 12500, currency: "eur", last30DaysCents: 4500 },
      }),
    });
  });

  it.each([
    "bookings_created",
    "revenue",
    "users_created",
    "events_created",
  ])("returns sensible timeseries data for %s", async (metric) => {
    const req = createMockReq({
      query: {
        metric,
        from: "2026-04-11",
        to: "2026-04-12",
      },
    });
    const res = createMockRes();

    await adminAnalyticsController.getTimeseries(req, res);

    expect(AdminAnalytics.getTimeseries).toHaveBeenCalledWith({
      metric,
      from: new Date("2026-04-11T00:00:00.000Z"),
      to: new Date("2026-04-12T23:59:59.999Z"),
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Analytics timeseries retrieved successfully",
      data: {
        metric,
        from: "2026-04-11",
        to: "2026-04-12",
        points: [
          { date: "2026-04-11", value: 1 },
          { date: "2026-04-12", value: 0 },
        ],
      },
    });
  });

  it("rejects invalid timeseries metric", async () => {
    const req = createMockReq({
      query: {
        metric: "profit",
        from: "2026-04-11",
        to: "2026-04-12",
      },
    });
    const res = createMockRes();

    await adminAnalyticsController.getTimeseries(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(AdminAnalytics.getTimeseries).not.toHaveBeenCalled();
  });

  it("rejects timeseries from after to", async () => {
    const req = createMockReq({
      query: {
        metric: "revenue",
        from: "2026-04-13",
        to: "2026-04-12",
      },
    });
    const res = createMockRes();

    await adminAnalyticsController.getTimeseries(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "from must be less than or equal to to",
    });
  });

  it("rejects timeseries ranges above 365 days", async () => {
    const req = createMockReq({
      query: {
        metric: "revenue",
        from: "2025-01-01",
        to: "2026-01-02",
      },
    });
    const res = createMockRes();

    await adminAnalyticsController.getTimeseries(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "date range must be 365 days or less",
    });
  });

  it("returns top events sorted by revenue by default", async () => {
    const req = createMockReq({
      query: { limit: "10" },
    });
    const res = createMockRes();

    await adminAnalyticsController.getTopEvents(req, res);

    expect(AdminAnalytics.getTopEvents).toHaveBeenCalledWith({
      sortBy: "revenue",
      limit: 10,
      from: null,
      to: null,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns top events sorted by bookings with date filters", async () => {
    const req = createMockReq({
      query: {
        sortBy: "bookings",
        limit: "5",
        from: "2026-04-01",
        to: "2026-04-30",
      },
    });
    const res = createMockRes();

    await adminAnalyticsController.getTopEvents(req, res);

    expect(AdminAnalytics.getTopEvents).toHaveBeenCalledWith({
      sortBy: "bookings",
      limit: 5,
      from: new Date("2026-04-01T00:00:00.000Z"),
      to: new Date("2026-04-30T23:59:59.999Z"),
    });
  });

  it.each(["revenue", "events", "bookings"])(
    "returns top organizers sorted by %s",
    async (sortBy) => {
      const req = createMockReq({
        query: { sortBy, limit: "10" },
      });
      const res = createMockRes();

      await adminAnalyticsController.getTopOrganizers(req, res);

      expect(AdminAnalytics.getTopOrganizers).toHaveBeenCalledWith({
        sortBy,
        limit: 10,
      });
      expect(res.status).toHaveBeenCalledWith(200);
    }
  );

  it("rejects invalid top organizer sort", async () => {
    const req = createMockReq({
      query: { sortBy: "rating" },
    });
    const res = createMockRes();

    await adminAnalyticsController.getTopOrganizers(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(AdminAnalytics.getTopOrganizers).not.toHaveBeenCalled();
  });

  it("rejects top list limits above 25", async () => {
    const req = createMockReq({
      query: { limit: "26" },
    });
    const res = createMockRes();

    await adminAnalyticsController.getTopEvents(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "limit must be less than or equal to 25",
    });
  });
});
