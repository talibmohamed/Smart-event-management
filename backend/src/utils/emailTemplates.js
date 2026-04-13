const appName = "Smart Event Management";

const formatDate = (value) =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));

const formatPrice = (price, currency = "eur") =>
  new Intl.NumberFormat("en", {
    style: "currency",
    currency: String(currency || "eur").toUpperCase()
  }).format(Number(price || 0));

const eventLocation = (event) =>
  [event.address, event.city].filter(Boolean).join(", ");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const baseHtml = ({ title, intro, lines = [] }) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(intro)}</p>
    ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
    <p style="margin-top: 24px;">${appName}</p>
  </div>
`;

const baseText = ({ title, intro, lines = [] }) =>
  [title, "", intro, ...lines, "", appName].join("\n");

const createEmail = ({ to, subject, title, intro, lines }) => ({
  to,
  subject,
  html: baseHtml({ title, intro, lines }),
  text: baseText({ title, intro, lines })
});

export const bookingConfirmedEmail = ({ attendee, event, booking }) =>
  createEmail({
    to: attendee.email,
    subject: `Booking confirmed: ${event.title}`,
    title: "Your booking is confirmed",
    intro: `Hello ${attendee.first_name}, your booking for ${event.title} is confirmed.`,
    lines: [
      `Date: ${formatDate(event.event_date)}`,
      `Location: ${eventLocation(event)}`,
      `Booking status: ${booking.status}`
    ]
  });

export const organizerBookingNotificationEmail = ({
  organizer,
  attendee,
  event,
  booking
}) =>
  createEmail({
    to: organizer.email,
    subject: `New booking: ${event.title}`,
    title: "New attendee booking",
    intro: `${attendee.first_name} ${attendee.last_name} booked ${event.title}.`,
    lines: [
      `Date: ${formatDate(event.event_date)}`,
      `Booking status: ${booking.status}`,
      `Payment status: ${booking.payment_status || "not required"}`
    ]
  });

export const paymentFailedEmail = ({ attendee, event, reason }) =>
  createEmail({
    to: attendee.email,
    subject: `Payment failed: ${event.title}`,
    title: "Payment could not confirm your booking",
    intro: `Hello ${attendee.first_name}, your payment for ${event.title} could not be confirmed.`,
    lines: [
      `Reason: ${reason}`,
      "Your booking was cancelled. You can try booking again if seats are still available."
    ]
  });

export const paymentExpiredEmail = ({ attendee, event }) =>
  createEmail({
    to: attendee.email,
    subject: `Payment expired: ${event.title}`,
    title: "Your payment session expired",
    intro: `Hello ${attendee.first_name}, your checkout session for ${event.title} expired.`,
    lines: ["Your booking was cancelled. You can start a new booking if seats are still available."]
  });

export const bookingCancelledEmail = ({ attendee, event }) =>
  createEmail({
    to: attendee.email,
    subject: `Booking cancelled: ${event.title}`,
    title: "Your booking was cancelled",
    intro: `Hello ${attendee.first_name}, your booking for ${event.title} was cancelled.`,
    lines: [
      `Date: ${formatDate(event.event_date)}`,
      `Location: ${eventLocation(event)}`
    ]
  });

export const organizerBookingCancelledEmail = ({ organizer, attendee, event }) =>
  createEmail({
    to: organizer.email,
    subject: `Booking cancelled: ${event.title}`,
    title: "An attendee cancelled a booking",
    intro: `${attendee.first_name} ${attendee.last_name} cancelled their booking for ${event.title}.`,
    lines: [`Date: ${formatDate(event.event_date)}`]
  });

export const eventUpdatedEmail = ({ attendee, beforeEvent, afterEvent }) =>
  createEmail({
    to: attendee.email,
    subject: `Event updated: ${afterEvent.title}`,
    title: "An event you booked was updated",
    intro: `Hello ${attendee.first_name}, an event you booked has updated details.`,
    lines: [
      `Event: ${afterEvent.title}`,
      `Date: ${formatDate(afterEvent.event_date)}`,
      `Location: ${eventLocation(afterEvent)}`,
      `Price: ${formatPrice(afterEvent.price)}`,
      `Previous details: ${beforeEvent.title}, ${formatDate(beforeEvent.event_date)}, ${eventLocation(beforeEvent)}`
    ]
  });

export const eventDeletedEmail = ({ attendee, event }) =>
  createEmail({
    to: attendee.email,
    subject: `Event cancelled: ${event.title}`,
    title: "An event you booked was cancelled",
    intro: `Hello ${attendee.first_name}, ${event.title} was cancelled by the organizer or admin.`,
    lines: [
      `Date: ${formatDate(event.event_date)}`,
      `Location: ${eventLocation(event)}`
    ]
  });

export const passwordResetEmail = ({ user, resetUrl, expiresInMinutes }) =>
  createEmail({
    to: user.email,
    subject: "Reset your Smart Event Management password",
    title: "Reset your password",
    intro: `Hello ${user.first_name}, we received a request to reset your password.`,
    lines: [
      `Reset link: ${resetUrl}`,
      `This link expires in ${expiresInMinutes} minutes.`,
      "If you did not request this, you can ignore this email."
    ]
  });
