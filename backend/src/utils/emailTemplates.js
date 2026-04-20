const appName = "Quickseat";
const appSlogan = "YOUR SEAT, FASTER THAN EVER";

const colors = {
  background: "#f4f7fb",
  card: "#ffffff",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
  primary: "#0f766e",
  success: "#15803d",
  danger: "#dc2626",
  warning: "#d97706",
  info: "#2563eb",
};

const statusStyles = {
  success: { background: "#dcfce7", color: colors.success },
  danger: { background: "#fee2e2", color: colors.danger },
  warning: { background: "#fef3c7", color: colors.warning },
  info: { background: "#dbeafe", color: colors.info },
  neutral: { background: "#f3f4f6", color: colors.muted },
};

const formatDate = (value) =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const formatPrice = (price, currency = "eur") =>
  new Intl.NumberFormat("en", {
    style: "currency",
    currency: String(currency || "eur").toUpperCase(),
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

const asDetail = (label, value) =>
  value === null || value === undefined || value === ""
    ? null
    : { label, value };

const detailRowsHtml = (details = []) => {
  const rows = details.filter(Boolean);

  if (!rows.length) {
    return "";
  }

  return `
    <div style="margin-top: 22px; border: 1px solid ${colors.border}; border-radius: 14px; overflow: hidden;">
      ${rows.map((row, index) => `
        <div style="padding: 14px 16px; ${index > 0 ? `border-top: 1px solid ${colors.border};` : ""}">
          <div style="font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: ${colors.muted}; margin-bottom: 4px;">${escapeHtml(row.label)}</div>
          <div style="font-size: 15px; color: ${colors.text}; font-weight: 600;">${escapeHtml(row.value)}</div>
        </div>
      `).join("")}
    </div>
  `;
};

const ctaHtml = (cta) => {
  if (!cta?.url || !cta?.label) {
    return "";
  }

  return `
    <div style="margin-top: 24px;">
      <a href="${escapeHtml(cta.url)}" style="display: inline-block; background: ${colors.primary}; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 13px 20px; border-radius: 999px;">
        ${escapeHtml(cta.label)}
      </a>
    </div>
  `;
};

const baseHtml = ({
  title,
  intro,
  statusLabel,
  status = "neutral",
  details = [],
  cta,
  extraHtml = "",
}) => {
  const statusStyle = statusStyles[status] || statusStyles.neutral;

  return `
    <div style="margin: 0; padding: 0; background: ${colors.background}; color: ${colors.text};">
      <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${escapeHtml(intro)}</div>
      <div style="max-width: 680px; margin: 0 auto; padding: 32px 16px; font-family: Arial, Helvetica, sans-serif;">
        <div style="padding: 0 4px 18px;">
          <div style="font-size: 20px; font-weight: 800; color: ${colors.primary};">${appName}</div>
          <div style="font-size: 13px; color: ${colors.muted}; margin-top: 3px;">${appSlogan}</div>
        </div>

        <div style="background: ${colors.card}; border: 1px solid ${colors.border}; border-radius: 22px; padding: 32px; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);">
          ${statusLabel ? `
            <div style="display: inline-block; padding: 7px 11px; border-radius: 999px; background: ${statusStyle.background}; color: ${statusStyle.color}; font-size: 12px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase;">
              ${escapeHtml(statusLabel)}
            </div>
          ` : ""}

          <h1 style="margin: 18px 0 12px; font-size: 28px; line-height: 1.2; color: ${colors.text};">${escapeHtml(title)}</h1>
          <p style="margin: 0; color: ${colors.muted}; font-size: 16px; line-height: 1.65;">${escapeHtml(intro)}</p>

          ${detailRowsHtml(details)}
          ${ctaHtml(cta)}
          ${extraHtml}
        </div>

        <div style="padding: 18px 4px 0; color: ${colors.muted}; font-size: 12px; line-height: 1.6;">
          <div style="font-weight: 700; color: ${colors.text};">${appName}</div>
          <div>This is an automated transactional email. If something looks wrong, contact the event organizer or platform admin.</div>
        </div>
      </div>
    </div>
  `;
};

const baseText = ({
  title,
  intro,
  details = [],
  cta,
  extraText = "",
}) =>
  [
    title,
    "",
    intro,
    "",
    ...details.filter(Boolean).map((detail) => `${detail.label}: ${detail.value}`),
    cta?.url ? `${cta.label}: ${cta.url}` : null,
    extraText,
    "",
    appName,
  ].filter(Boolean).join("\n");

const createEmail = ({
  to,
  subject,
  title,
  intro,
  status,
  statusLabel,
  details,
  cta,
  extraHtml,
  extraText,
  attachments,
}) => ({
  to,
  subject,
  html: baseHtml({ title, intro, status, statusLabel, details, cta, extraHtml }),
  text: baseText({ title, intro, details, cta, extraText }),
  attachments,
});

const ticketHtml = (tickets = []) => {
  if (!tickets.length) {
    return "";
  }

  return `
    <div style="margin-top: 28px;">
      <h2 style="font-size: 18px; color: ${colors.text}; margin: 0 0 14px;">Your tickets</h2>
      ${tickets.map((ticket) => `
        <div style="margin: 14px 0; padding: 18px; border: 1px solid ${colors.border}; border-radius: 16px; background: #fbfdff;">
          <div style="font-size: 15px; font-weight: 800; color: ${colors.text};">${escapeHtml(ticket.ticket_tier_name || "Ticket")}</div>
          <div style="font-size: 13px; color: ${colors.muted}; margin-top: 6px;">Ticket code</div>
          <div style="font-size: 15px; font-weight: 700; color: ${colors.text}; letter-spacing: .02em;">${escapeHtml(ticket.ticket_code)}</div>
          ${ticket.qr_src ? `
            <div style="margin-top: 14px;">
              <img alt="Ticket QR code" width="160" height="160" src="${ticket.qr_src}" style="display: block; border: 1px solid ${colors.border}; border-radius: 10px;" />
            </div>
          ` : ""}
        </div>
      `).join("")}
    </div>
  `;
};

const ticketText = (tickets = []) => {
  if (!tickets.length) {
    return "";
  }

  return [
    "Tickets:",
    ...tickets.map((ticket) =>
      `${ticket.ticket_tier_name || "Ticket"} - Code: ${ticket.ticket_code}`
    ),
  ].join("\n");
};

export const bookingConfirmedEmail = ({
  attendee,
  event,
  booking,
  ticketUrl,
  tickets = [],
  attachments,
}) =>
  createEmail({
    to: attendee.email,
    subject: `Booking confirmed: ${event.title}`,
    title: "Your booking is confirmed",
    status: "success",
    statusLabel: "Confirmed",
    intro: `Hello ${attendee.first_name}, your booking for ${event.title} is confirmed.`,
    details: [
      asDetail("Event", event.title),
      asDetail("Date", formatDate(event.event_date)),
      asDetail("Location", eventLocation(event)),
      asDetail("Booking status", booking.status),
    ],
    cta: ticketUrl ? { label: "View your tickets", url: ticketUrl } : null,
    extraHtml: ticketHtml(tickets),
    extraText: ticketText(tickets),
    attachments,
  });

export const organizerBookingNotificationEmail = ({
  organizer,
  attendee,
  event,
  booking,
}) =>
  createEmail({
    to: organizer.email,
    subject: `New booking: ${event.title}`,
    title: "New attendee booking",
    status: "info",
    statusLabel: "New booking",
    intro: `${attendee.first_name} ${attendee.last_name} booked ${event.title}.`,
    details: [
      asDetail("Attendee", `${attendee.first_name} ${attendee.last_name}`),
      asDetail("Event", event.title),
      asDetail("Date", formatDate(event.event_date)),
      asDetail("Booking status", booking.status),
      asDetail("Payment status", booking.payment_status || "not required"),
    ],
  });

export const paymentFailedEmail = ({ attendee, event, reason }) =>
  createEmail({
    to: attendee.email,
    subject: `Payment failed: ${event.title}`,
    title: "Payment could not confirm your booking",
    status: "danger",
    statusLabel: "Payment failed",
    intro: `Hello ${attendee.first_name}, your payment for ${event.title} could not be confirmed.`,
    details: [
      asDetail("Event", event.title),
      asDetail("Reason", reason),
      asDetail("Next step", "Your booking was cancelled. You can try booking again if seats are still available."),
    ],
  });

export const paymentExpiredEmail = ({ attendee, event }) =>
  createEmail({
    to: attendee.email,
    subject: `Payment expired: ${event.title}`,
    title: "Your payment session expired",
    status: "warning",
    statusLabel: "Expired",
    intro: `Hello ${attendee.first_name}, your checkout session for ${event.title} expired.`,
    details: [
      asDetail("Event", event.title),
      asDetail("Status", "Your booking was cancelled."),
      asDetail("Next step", "You can start a new booking if seats are still available."),
    ],
  });

export const bookingCancelledEmail = ({ attendee, event }) =>
  createEmail({
    to: attendee.email,
    subject: `Booking cancelled: ${event.title}`,
    title: "Your booking was cancelled",
    status: "danger",
    statusLabel: "Cancelled",
    intro: `Hello ${attendee.first_name}, your booking for ${event.title} was cancelled.`,
    details: [
      asDetail("Event", event.title),
      asDetail("Date", formatDate(event.event_date)),
      asDetail("Location", eventLocation(event)),
    ],
  });

export const organizerBookingCancelledEmail = ({ organizer, attendee, event }) =>
  createEmail({
    to: organizer.email,
    subject: `Booking cancelled: ${event.title}`,
    title: "An attendee cancelled a booking",
    status: "warning",
    statusLabel: "Cancelled booking",
    intro: `${attendee.first_name} ${attendee.last_name} cancelled their booking for ${event.title}.`,
    details: [
      asDetail("Attendee", `${attendee.first_name} ${attendee.last_name}`),
      asDetail("Event", event.title),
      asDetail("Date", formatDate(event.event_date)),
    ],
  });

export const eventUpdatedEmail = ({ attendee, beforeEvent, afterEvent }) =>
  createEmail({
    to: attendee.email,
    subject: `Event updated: ${afterEvent.title}`,
    title: "An event you booked was updated",
    status: "warning",
    statusLabel: "Updated",
    intro: `Hello ${attendee.first_name}, an event you booked has updated details.`,
    details: [
      asDetail("Event", afterEvent.title),
      asDetail("Date", formatDate(afterEvent.event_date)),
      asDetail("Location", eventLocation(afterEvent)),
      asDetail("Price", formatPrice(afterEvent.price)),
      asDetail("Previous details", `${beforeEvent.title}, ${formatDate(beforeEvent.event_date)}, ${eventLocation(beforeEvent)}`),
    ],
  });

export const eventDeletedEmail = ({ attendee, event }) =>
  createEmail({
    to: attendee.email,
    subject: `Event cancelled: ${event.title}`,
    title: "An event you booked was cancelled",
    status: "danger",
    statusLabel: "Event cancelled",
    intro: `Hello ${attendee.first_name}, ${event.title} was cancelled by the organizer or admin.`,
    details: [
      asDetail("Event", event.title),
      asDetail("Date", formatDate(event.event_date)),
      asDetail("Location", eventLocation(event)),
    ],
  });

export const passwordResetEmail = ({ user, resetUrl, expiresInMinutes }) =>
  createEmail({
    to: user.email,
    subject: "Reset your Quickseat password",
    title: "Reset your password",
    status: "info",
    statusLabel: "Password reset",
    intro: `Hello ${user.first_name}, we received a request to reset your password.`,
    details: [
      asDetail("Expires in", `${expiresInMinutes} minutes`),
      asDetail("Security note", "If you did not request this, you can ignore this email."),
    ],
    cta: { label: "Reset password", url: resetUrl },
  });

export const eventReminderEmail = ({ attendee, event, reminderLabel, eventUrl }) =>
  createEmail({
    to: attendee.email,
    subject: `Reminder: ${event.title}`,
    title: `${event.title} starts ${reminderLabel}`,
    status: "info",
    statusLabel: "Event reminder",
    intro: `Hello ${attendee.first_name}, this is a reminder that ${event.title} starts ${reminderLabel}.`,
    details: [
      asDetail("Event", event.title),
      asDetail("Date", formatDate(event.event_date)),
      asDetail("Timezone", event.timezone || "Europe/Paris"),
      asDetail("Location", eventLocation(event)),
    ],
    cta: eventUrl ? { label: "View event", url: eventUrl } : null,
  });
