import { describe, expect, it } from "vitest";
import {
  buildTransactionWhere,
  formatTransactionDetail,
  formatTransactionListItem,
  transactionDetailSelect,
  transactionListSelect,
} from "../AdminTransaction.js";

const bookingRecord = (overrides = {}) => ({
  id: "booking-1",
  booking_date: new Date("2026-04-13T10:00:00.000Z"),
  status: "confirmed",
  payment_status: "paid",
  amount_paid: "125.00",
  currency: "eur",
  stripe_checkout_session_id: "cs_test_123",
  stripe_payment_intent_id: "pi_test_123",
  stripe_event_id: "evt_test_123",
  user: {
    id: "user-1",
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
  },
  event: {
    id: "event-1",
    title: "Tech Conference",
    event_date: new Date("2026-05-13T10:00:00.000Z"),
    organizer: {
      id: "organizer-1",
      first_name: "Jane",
      last_name: "Organizer",
      email: "jane@example.com",
    },
  },
  items: [
    {
      ticket_tier_id: "tier-1",
      quantity: 2,
      unit_price: "62.50",
      total_price: "125.00",
      ticketTier: {
        name: "VIP",
      },
    },
  ],
  tickets: [{ ticket_code: "SEM-1" }, { ticket_code: "SEM-2" }],
  _count: {
    tickets: 2,
  },
  ...overrides,
});

describe("admin transaction model helpers", () => {
  it("does not select sensitive user fields", () => {
    const serializedSelects = JSON.stringify({
      transactionListSelect,
      transactionDetailSelect,
    });

    expect(serializedSelects).not.toContain("password_hash");
    expect(serializedSelects).not.toContain("password_reset_token_hash");
    expect(serializedSelects).not.toContain("password_reset_expires_at");
  });

  it.each([
    ["user email", "email"],
    ["user first name", "first_name"],
    ["user last name", "last_name"],
    ["event title", "title"],
    ["checkout session", "stripe_checkout_session_id"],
    ["payment intent", "stripe_payment_intent_id"],
  ])("builds search where for %s", (_label, expectedField) => {
    const where = buildTransactionWhere({ q: "john" });

    expect(JSON.stringify(where)).toContain(expectedField);
  });

  it("builds status, payment status, and date filters", () => {
    const dateFrom = new Date("2026-04-01T00:00:00.000Z");
    const dateTo = new Date("2026-04-30T00:00:00.000Z");

    expect(
      buildTransactionWhere({
        status: "confirmed",
        paymentStatus: "paid",
        dateFrom,
        dateTo,
      })
    ).toEqual({
      status: "confirmed",
      payment_status: "paid",
      booking_date: {
        gte: dateFrom,
        lte: dateTo,
      },
    });
  });

  it("formats amountPaidCents as null when no payment is recorded", () => {
    const transaction = formatTransactionListItem(
      bookingRecord({
        amount_paid: null,
        payment_status: "unpaid",
      })
    );

    expect(transaction.amountPaidCents).toBeNull();
  });

  it("formats detail items and capped ticket codes metadata", () => {
    const detail = formatTransactionDetail(
      bookingRecord({
        tickets: Array.from({ length: 50 }, (_, index) => ({
          ticket_code: `SEM-${index + 1}`,
        })),
        _count: {
          tickets: 52,
        },
      })
    );

    expect(detail.items).toEqual([
      {
        ticketTierId: "tier-1",
        ticketTierName: "VIP",
        quantity: 2,
        unitPriceCents: 6250,
        totalPriceCents: 12500,
      },
    ]);
    expect(detail.ticketCodes).toHaveLength(50);
    expect(detail.ticketsCount).toBe(52);
    expect(detail.ticketCodesTruncated).toBe(true);
  });
});
