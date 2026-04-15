import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = {
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
};

vi.mock("../../config/prisma.js", () => ({
  default: {
    $transaction: vi.fn((callback) => callback(tx)),
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

const { default: Ticket } = await import("../Ticket.js");

describe("Ticket model", () => {
  beforeEach(() => {
    tx.$queryRaw.mockReset();
    tx.$executeRaw.mockReset();
  });

  it("creates one ticket per booking item quantity", async () => {
    tx.$queryRaw
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([
        {
          booking_id: "booking-1",
          booking_item_id: "booking-item-1",
          event_id: "event-1",
          user_id: "user-1",
          ticket_tier_id: "tier-1",
          quantity: 2,
        },
        {
          booking_id: "booking-1",
          booking_item_id: "booking-item-2",
          event_id: "event-1",
          user_id: "user-1",
          ticket_tier_id: "tier-2",
          quantity: 1,
        },
      ])
      .mockResolvedValueOnce([]);
    tx.$executeRaw.mockResolvedValue(undefined);

    await Ticket.generateTicketsForBooking("booking-1");

    expect(tx.$executeRaw).toHaveBeenCalledTimes(3);
  });

  it("skips generation safely when booking already has tickets", async () => {
    tx.$queryRaw
      .mockResolvedValueOnce([{ total: 2 }])
      .mockResolvedValueOnce([]);

    const result = await Ticket.generateTicketsForBooking("booking-1");

    expect(result.created).toBe(false);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
});
