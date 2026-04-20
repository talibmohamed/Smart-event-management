import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../models/Notification.js", () => ({
  default: {
    createNotification: vi.fn(),
    getAdminUserIds: vi.fn(),
  },
}));

vi.mock("../../utils/socket.js", () => ({
  emitNotificationToUser: vi.fn(),
}));

const { default: Notification } = await import("../../models/Notification.js");
const { emitNotificationToUser } = await import("../../utils/socket.js");
const notificationService = (await import("../notificationService.js")).default;

const mockNotification = (userId) => ({
  id: `notification-${userId}`,
  user_id: userId,
  type: "booking_confirmed",
  title: "Booking confirmed",
  message: "Booking confirmed",
  data: {},
  read_at: null,
  created_at: new Date("2026-04-19T10:00:00.000Z"),
});

describe("notification service", () => {
  beforeEach(() => {
    Notification.createNotification.mockImplementation(({ user_id }) =>
      Promise.resolve({
        created: true,
        notification: mockNotification(user_id),
      })
    );
    Notification.getAdminUserIds.mockResolvedValue(["admin-1"]);
  });

  it("deduplicates recipients and emits only newly created notifications", async () => {
    await notificationService.createForRecipients({
      recipientIds: ["user-1", "user-1", "admin-1"],
      type: "booking_confirmed",
      title: "Booking confirmed",
      message: "Booking confirmed",
      data: { booking_id: "booking-1" },
      dedupeKey: "booking:booking-1:confirmed",
    });

    expect(Notification.createNotification).toHaveBeenCalledTimes(2);
    expect(emitNotificationToUser).toHaveBeenCalledTimes(2);
    expect(Notification.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        dedupe_key: "booking_confirmed:user-1:booking:booking-1:confirmed",
      })
    );
  });

  it("does not emit when a duplicate notification is skipped", async () => {
    Notification.createNotification.mockResolvedValue({
      created: false,
      notification: mockNotification("user-1"),
    });

    await notificationService.createForRecipients({
      recipientIds: ["user-1"],
      type: "booking_confirmed",
      title: "Booking confirmed",
      message: "Booking confirmed",
      data: {},
      dedupeKey: "booking:booking-1:confirmed",
    });

    expect(emitNotificationToUser).not.toHaveBeenCalled();
  });

  it("creates booking confirmed notifications for attendee, organizer, and admins", async () => {
    await notificationService.notifyBookingConfirmed({
      booking: { id: "booking-1", user_id: "attendee-1" },
      attendee: { first_name: "John", last_name: "Doe" },
      event: {
        id: "event-1",
        title: "AI Product Workshop",
        organizer_id: "organizer-1",
      },
    });

    expect(Notification.createNotification).toHaveBeenCalledTimes(3);
    expect(Notification.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "attendee-1",
      })
    );
    expect(Notification.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "organizer-1",
      })
    );
    expect(Notification.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "admin-1",
      })
    );
  });
});
