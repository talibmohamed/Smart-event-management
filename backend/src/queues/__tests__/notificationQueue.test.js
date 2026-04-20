import { describe, expect, it, vi } from "vitest";
import { createNotificationJobId, enqueueNotificationJob } from "../notificationQueue.js";

describe("notification queue", () => {
  it("uses deterministic notification job ids", () => {
    expect(createNotificationJobId("notification-1")).toBe("notification:notification-1");
  });

  it("enqueues notification jobs without storing notification payload in Redis", async () => {
    const queue = {
      add: vi.fn().mockResolvedValue({ id: "notification:notification-1" }),
    };

    await enqueueNotificationJob({
      notification: {
        id: "notification-1",
        user_id: "user-1",
        type: "event_reminder_1h",
      },
      queue,
    });

    expect(queue.add).toHaveBeenCalledWith(
      "emit-notification",
      { notificationId: "notification-1" },
      expect.objectContaining({
        jobId: "notification:notification-1",
      })
    );
  });
});
