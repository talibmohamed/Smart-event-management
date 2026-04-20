import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockReq, createMockRes, mockUser } from "../../test/setup.js";

vi.mock("../../models/Notification.js", () => ({
  default: {
    getNotificationsForUser: vi.fn(),
    countUnreadForUser: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
}));

const { default: Notification } = await import("../../models/Notification.js");
const notificationController = (await import("../notificationController.js")).default;

const mockNotification = (overrides = {}) => ({
  id: "notification-1",
  user_id: "user-1",
  type: "booking_confirmed",
  title: "Booking confirmed",
  message: "John booked AI Product Workshop",
  data: { event_id: "event-1", booking_id: "booking-1" },
  read_at: null,
  created_at: new Date("2026-04-19T10:00:00.000Z"),
  ...overrides,
});

describe("notification controller", () => {
  beforeEach(() => {
    Notification.getNotificationsForUser.mockResolvedValue([mockNotification()]);
    Notification.countUnreadForUser.mockResolvedValue(1);
    Notification.markNotificationRead.mockResolvedValue(
      mockNotification({ read_at: new Date("2026-04-19T10:05:00.000Z") })
    );
    Notification.markAllNotificationsRead.mockResolvedValue([
      mockNotification({ read_at: new Date("2026-04-19T10:05:00.000Z") }),
    ]);
  });

  it("lists current user notifications with unread count", async () => {
    const req = createMockReq({
      query: { status: "unread", limit: "20" },
      user: mockUser({ id: "user-1" }),
    });
    const res = createMockRes();

    await notificationController.getMyNotifications(req, res);

    expect(Notification.getNotificationsForUser).toHaveBeenCalledWith({
      user_id: "user-1",
      status: "unread",
      limit: "20",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Notifications retrieved successfully",
      data: {
        notifications: [mockNotification()],
        unread_count: 1,
      },
    });
  });

  it("rejects invalid notification status filter", async () => {
    const req = createMockReq({
      query: { status: "read" },
      user: mockUser({ id: "user-1" }),
    });
    const res = createMockRes();

    await notificationController.getMyNotifications(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Notification.getNotificationsForUser).not.toHaveBeenCalled();
  });

  it("marks current user's notification as read", async () => {
    const req = createMockReq({
      params: { id: "notification-1" },
      user: mockUser({ id: "user-1" }),
    });
    const res = createMockRes();

    await notificationController.markNotificationRead(req, res);

    expect(Notification.markNotificationRead).toHaveBeenCalledWith({
      id: "notification-1",
      user_id: "user-1",
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 404 when marking another user's notification", async () => {
    Notification.markNotificationRead.mockResolvedValue(null);
    const req = createMockReq({
      params: { id: "notification-2" },
      user: mockUser({ id: "user-1" }),
    });
    const res = createMockRes();

    await notificationController.markNotificationRead(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("marks all current user notifications as read", async () => {
    const req = createMockReq({ user: mockUser({ id: "user-1" }) });
    const res = createMockRes();

    await notificationController.markAllNotificationsRead(req, res);

    expect(Notification.markAllNotificationsRead).toHaveBeenCalledWith("user-1");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unread_count: 0,
        }),
      })
    );
  });
});
