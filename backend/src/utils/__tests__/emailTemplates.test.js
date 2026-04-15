import { describe, expect, it } from "vitest";
import {
  bookingConfirmedEmail,
  eventDeletedEmail,
  eventUpdatedEmail,
  passwordResetEmail,
  paymentExpiredEmail,
  paymentFailedEmail,
} from "../emailTemplates.js";

const attendee = {
  first_name: "Mohamed",
  last_name: "Rafik",
  email: "mohamed@example.com",
};

const event = {
  title: "Smart Tech Conference",
  address: "28 Rue Notre Dame des Champs",
  city: "Paris",
  event_date: "2026-04-28T21:03:00.000Z",
  price: "25.00",
};

describe("email templates", () => {
  it("builds styled booking confirmation email with CTA, ticket card, cid QR, and attachments", () => {
    const email = bookingConfirmedEmail({
      attendee,
      event,
      booking: {
        id: "booking-1",
        status: "confirmed",
      },
      ticketUrl: "http://localhost:5173/bookings/booking-1/tickets",
      tickets: [
        {
          ticket_tier_name: "Standard",
          ticket_code: "SEM-TEST123",
          qr_src: "cid:ticket-qr-0-SEM-TEST123",
        },
      ],
      attachments: [{ filename: "ticket.pdf", content: "base64" }],
    });

    expect(email.html).toContain("background: #f4f7fb");
    expect(email.html).toContain("Your booking is confirmed");
    expect(email.html).toContain("View your tickets");
    expect(email.html).toContain("cid:ticket-qr-0-SEM-TEST123");
    expect(email.html).toContain("SEM-TEST123");
    expect(email.text).toContain("View your tickets: http://localhost:5173/bookings/booking-1/tickets");
    expect(email.attachments).toEqual([{ filename: "ticket.pdf", content: "base64" }]);
  });

  it("builds styled password reset email with CTA and raw URL text fallback", () => {
    const email = passwordResetEmail({
      user: attendee,
      resetUrl: "http://localhost:5173/reset-password?token=abc",
      expiresInMinutes: 60,
    });

    expect(email.html).toContain("Reset password");
    expect(email.html).toContain("http://localhost:5173/reset-password?token=abc");
    expect(email.text).toContain("Reset password: http://localhost:5173/reset-password?token=abc");
  });

  it("uses danger and warning status styles for payment failure and expiration", () => {
    const failed = paymentFailedEmail({
      attendee,
      event,
      reason: "The event became full before payment confirmation",
    });
    const expired = paymentExpiredEmail({ attendee, event });

    expect(failed.html).toContain("#fee2e2");
    expect(failed.html).toContain("Payment failed");
    expect(expired.html).toContain("#fef3c7");
    expect(expired.html).toContain("Expired");
  });

  it("keeps event update and delete details in styled templates", () => {
    const updated = eventUpdatedEmail({
      attendee,
      beforeEvent: {
        ...event,
        title: "Old Event",
        city: "Lyon",
      },
      afterEvent: event,
    });
    const deleted = eventDeletedEmail({ attendee, event });

    expect(updated.html).toContain("Smart Tech Conference");
    expect(updated.html).toContain("Previous details");
    expect(deleted.html).toContain("Event cancelled");
    expect(deleted.html).toContain("28 Rue Notre Dame des Champs");
  });
});
