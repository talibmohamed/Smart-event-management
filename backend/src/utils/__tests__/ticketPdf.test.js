import { describe, expect, it } from "vitest";
import { buildTicketPdfAttachment, generateTicketsPdf } from "../ticketPdf.js";

const booking = {
  id: "booking-test-1",
};

const event = {
  title: "Smart Tech Conference",
  event_date: "2026-04-28T21:03:00.000Z",
  address: "28 Rue Notre Dame des Champs",
  city: "Paris",
};

const tickets = [
  {
    id: "ticket-test-1",
    ticket_code: "SEM-TEST123",
    qr_value: "SEM-TEST123",
    status: "valid",
    ticket_tier: {
      name: "VIP",
    },
    attendee: {
      first_name: "Mohamed",
      last_name: "Rafik",
      email: "mohamed@example.com",
    },
  },
];

describe("ticket PDF utility", () => {
  it("generates a valid PDF buffer", async () => {
    const pdf = await generateTicketsPdf({ booking, event, tickets });

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("builds a base64 PDF attachment", async () => {
    const attachment = await buildTicketPdfAttachment({ booking, event, tickets });

    expect(attachment.filename).toBe("smart-event-tickets-booking-test-1.pdf");
    expect(typeof attachment.content).toBe("string");
    expect(Buffer.from(attachment.content, "base64").subarray(0, 4).toString()).toBe("%PDF");
  });
});
