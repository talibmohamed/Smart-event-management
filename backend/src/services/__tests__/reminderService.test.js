import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config/prisma.js", () => ({
  default: {
    eventReminderDelivery: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../utils/emailService.js", () => ({
  sendEmail: vi.fn(),
}));

const { default: prisma } = await import("../../config/prisma.js");
const { sendEmail } = await import("../../utils/emailService.js");
const { sendReminderEmailForDelivery } = await import("../reminderService.js");

const mockDelivery = (overrides = {}) => ({
  id: "delivery-1",
  reminder_key: "1h",
  email_sent: false,
  retry_count: 0,
  event: {
    id: "event-1",
    title: "AI Product Workshop",
    event_date: new Date("2026-05-14T09:30:00.000Z"),
    timezone: "Europe/Paris",
    address: "28 Rue Notre Dame des Champs",
    city: "Paris",
  },
  user: {
    id: "user-1",
    first_name: "Emma",
    last_name: "Dubois",
    email: "emma@example.com",
  },
  ...overrides,
});

describe("reminder service email worker path", () => {
  beforeEach(() => {
    process.env.REMINDER_EMAIL_MAX_RETRIES = "3";
    prisma.eventReminderDelivery.findUnique.mockResolvedValue(mockDelivery());
    prisma.eventReminderDelivery.update.mockResolvedValue({});
    sendEmail.mockResolvedValue({});
  });

  it("marks reminder email as sent after successful delivery", async () => {
    const result = await sendReminderEmailForDelivery("delivery-1");

    expect(result.sent).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(prisma.eventReminderDelivery.update).toHaveBeenCalledWith({
      where: { id: "delivery-1" },
      data: {
        email_sent: true,
        last_attempt_at: expect.any(Date),
        last_error: null,
      },
    });
  });

  it("stores retry metadata after failed delivery", async () => {
    sendEmail.mockRejectedValue(new Error("email failed"));

    const result = await sendReminderEmailForDelivery("delivery-1");

    expect(result.sent).toBe(false);
    expect(prisma.eventReminderDelivery.update).toHaveBeenCalledWith({
      where: { id: "delivery-1" },
      data: {
        email_sent: false,
        retry_count: {
          increment: 1,
        },
        last_attempt_at: expect.any(Date),
        last_error: "email failed",
      },
    });
  });
});
