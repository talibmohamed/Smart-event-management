import { describe, expect, it } from "vitest";
import {
  parseBookingItems,
  parseEventTicketTiers,
} from "../ticketTiers.js";

describe("ticket tier utilities", () => {
  it("creates a fallback Standard tier when ticket_tiers is missing", () => {
    const tiers = parseEventTicketTiers({
      rawTicketTiers: undefined,
      fallbackPrice: 15,
      eventCapacity: 80,
    });

    expect(tiers).toEqual([
      {
        id: null,
        name: "Standard",
        description: "Standard ticket",
        price: 15,
        capacity: 80,
        is_active: true,
        sort_order: 0,
      },
    ]);
  });

  it("parses ticket tiers from an array and a multipart JSON string", () => {
    const tierPayload = [
      {
        name: "VIP",
        description: "Front-row access",
        price: "50",
        capacity: "20",
        is_active: "true",
      },
    ];

    expect(
      parseEventTicketTiers({
        rawTicketTiers: tierPayload,
        fallbackPrice: 10,
        eventCapacity: 100,
      })
    ).toMatchObject([{ name: "VIP", price: 50, capacity: 20 }]);

    expect(
      parseEventTicketTiers({
        rawTicketTiers: JSON.stringify(tierPayload),
        fallbackPrice: 10,
        eventCapacity: 100,
      })
    ).toMatchObject([{ name: "VIP", price: 50, capacity: 20 }]);
  });

  it("rejects invalid ticket_tiers JSON", () => {
    expect(() =>
      parseEventTicketTiers({
        rawTicketTiers: "{bad-json",
        fallbackPrice: 10,
        eventCapacity: 100,
      })
    ).toThrow("ticket_tiers must be valid JSON");
  });

  it("rejects invalid tier count and tier fields", () => {
    expect(() =>
      parseEventTicketTiers({
        rawTicketTiers: [],
        fallbackPrice: 10,
        eventCapacity: 100,
      })
    ).toThrow("Event must have between 1 and 10 ticket tiers");

    expect(() =>
      parseEventTicketTiers({
        rawTicketTiers: Array.from({ length: 11 }, (_, index) => ({
          name: `Tier ${index}`,
          price: 10,
          capacity: 1,
        })),
        fallbackPrice: 10,
        eventCapacity: 100,
      })
    ).toThrow("Event must have between 1 and 10 ticket tiers");

    for (const tier of [
      { name: "", price: 10, capacity: 10 },
      { name: "VIP", price: -1, capacity: 10 },
      { name: "VIP", price: 10, capacity: 0 },
    ]) {
      expect(() =>
        parseEventTicketTiers({
          rawTicketTiers: [tier],
          fallbackPrice: 10,
          eventCapacity: 100,
        })
      ).toThrow("Each ticket tier requires name, price >= 0, and capacity > 0");
    }
  });

  it("rejects tier capacity greater than event capacity", () => {
    expect(() =>
      parseEventTicketTiers({
        rawTicketTiers: [
          { name: "Standard", price: 10, capacity: 80 },
          { name: "VIP", price: 50, capacity: 30 },
        ],
        fallbackPrice: 10,
        eventCapacity: 100,
      })
    ).toThrow("Ticket tier capacities cannot exceed event capacity");
  });

  it("parses booking items and rejects invalid quantities", () => {
    expect(
      parseBookingItems([
        { ticket_tier_id: "tier-1", quantity: "2" },
        { ticket_tier_id: "tier-2", quantity: 1 },
      ])
    ).toEqual([
      { ticket_tier_id: "tier-1", quantity: 2 },
      { ticket_tier_id: "tier-2", quantity: 1 },
    ]);

    expect(() =>
      parseBookingItems([
        { ticket_tier_id: "tier-1", quantity: 3 },
        { ticket_tier_id: "tier-2", quantity: 3 },
      ])
    ).toThrow("You can book a maximum of 5 tickets per booking");

    for (const item of [
      { quantity: 1 },
      { ticket_tier_id: "tier-1", quantity: 0 },
    ]) {
      expect(() => parseBookingItems([item])).toThrow(
        "Each booking item requires ticket_tier_id and quantity > 0"
      );
    }
  });
});
