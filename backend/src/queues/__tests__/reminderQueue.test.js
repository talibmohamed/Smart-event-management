import { describe, expect, it, vi } from "vitest";
import { createReminderEmailJobId, enqueueReminderEmailJob } from "../reminderQueue.js";

describe("reminder queue", () => {
  it("uses deterministic reminder email job ids", () => {
    expect(createReminderEmailJobId("delivery-1")).toBe("reminder-email:delivery-1");
  });

  it("enqueues reminder email jobs with retry settings", async () => {
    const queue = {
      add: vi.fn().mockResolvedValue({ id: "reminder-email:delivery-1" }),
    };

    await enqueueReminderEmailJob({ deliveryId: "delivery-1", queue });

    expect(queue.add).toHaveBeenCalledWith(
      "send-reminder-email",
      { deliveryId: "delivery-1" },
      expect.objectContaining({
        jobId: "reminder-email:delivery-1",
        attempts: 3,
      })
    );
  });
});
