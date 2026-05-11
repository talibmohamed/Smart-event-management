import { describe, expect, it } from "vitest";
import {
  daysBetweenInclusive,
  eurosToCents,
  revenueBookingWhere,
  zeroFillDailySeries,
} from "../adminAnalytics.js";

describe("admin analytics utilities", () => {
  it("defines the shared confirmed paid revenue predicate", () => {
    expect(revenueBookingWhere()).toEqual({
      status: "confirmed",
      payment_status: "paid",
      amount_paid: {
        not: null,
      },
    });
  });

  it("converts decimal euro amounts to integer cents", () => {
    expect(eurosToCents("12.45")).toBe(1245);
    expect(eurosToCents(0)).toBe(0);
    expect(eurosToCents(null)).toBe(0);
  });

  it("zero-fills missing UTC days", () => {
    const points = zeroFillDailySeries({
      from: new Date("2026-04-11T00:00:00.000Z"),
      to: new Date("2026-04-14T23:59:59.999Z"),
      rows: [
        { date: "2026-04-11", value: 12 },
        { date: "2026-04-13", value: 7 },
      ],
    });

    expect(points).toEqual([
      { date: "2026-04-11", value: 12 },
      { date: "2026-04-12", value: 0 },
      { date: "2026-04-13", value: 7 },
      { date: "2026-04-14", value: 0 },
    ]);
  });

  it("counts inclusive UTC date ranges", () => {
    expect(
      daysBetweenInclusive(
        new Date("2026-04-11T00:00:00.000Z"),
        new Date("2026-04-12T23:59:59.999Z")
      )
    ).toBe(2);
  });
});
