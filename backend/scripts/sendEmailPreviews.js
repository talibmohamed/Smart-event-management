import "dotenv/config";
import { pathToFileURL } from "url";
import { sendEmail } from "../src/utils/emailService.js";
import {
  bookingCancelledEmail,
  bookingConfirmedEmail,
  eventDeletedEmail,
  eventUpdatedEmail,
  organizerBookingCancelledEmail,
  organizerBookingNotificationEmail,
  passwordResetEmail,
  paymentExpiredEmail,
  paymentFailedEmail,
} from "../src/utils/emailTemplates.js";
import { buildEmailTickets, getTicketUrl } from "../src/utils/ticketEmail.js";
import { buildTicketPdfAttachment } from "../src/utils/ticketPdf.js";

export function parsePreviewArgs(args) {
  const toIndex = args.indexOf("--to");
  const to = toIndex >= 0 ? args[toIndex + 1] : null;

  if (!to) {
    throw new Error("Usage: npm run email:preview -- --to email@example.com");
  }

  return { to };
}

const previewUser = (email) => ({
  id: "preview-user-1",
  first_name: "Mohamed",
  last_name: "Rafik",
  email,
});

const organizer = (email) => ({
  id: "preview-organizer-1",
  first_name: "Smart",
  last_name: "Organizer",
  email,
});

const event = {
  id: "preview-event-1",
  title: "Smart Tech Conference",
  address: "28 Rue Notre Dame des Champs",
  city: "Paris",
  event_date: "2026-04-28T21:03:00.000Z",
  price: "25.00",
};

const beforeEvent = {
  ...event,
  title: "Old Smart Tech Conference",
  address: "10 Rue Example",
  city: "Lyon",
  event_date: "2026-04-20T09:00:00.000Z",
  price: "15.00",
};

const booking = {
  id: "preview-booking-1",
  status: "confirmed",
  payment_status: "paid",
};

const rawTickets = [
  {
    id: "preview-ticket-1",
    ticket_code: "SEM-PREVIEW123",
    qr_value: "SEM-PREVIEW123",
    status: "valid",
    ticket_tier: {
      id: "preview-tier-1",
      name: "Standard",
    },
    attendee: previewUser("preview@example.com"),
  },
];

const sendPreview = async ({ name, payload }) => {
  try {
    const result = await sendEmail(payload);
    console.log(
      JSON.stringify({
        scope: "email_preview",
        template: name,
        action: "sent",
        id: result?.data?.id || result?.id || null,
      })
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        scope: "email_preview",
        template: name,
        action: "failed",
        error: error.message,
      })
    );
  }
};

export async function buildPreviewEmails(to) {
  const attendee = previewUser(to);
  const previewOrganizer = organizer(to);
  const ticketsForEmail = rawTickets.map((ticket) => ({
    ...ticket,
    attendee,
  }));
  const emailTicketData = await buildEmailTickets(ticketsForEmail);
  const ticketPdfAttachment = await buildTicketPdfAttachment({
    booking,
    event,
    tickets: ticketsForEmail,
  });
  const bookingAttachments = [
    ...emailTicketData.attachments,
    ...(ticketPdfAttachment ? [ticketPdfAttachment] : []),
  ];

  return [
    {
      name: "bookingConfirmedEmail",
      payload: bookingConfirmedEmail({
        attendee,
        event,
        booking,
        ticketUrl: getTicketUrl(booking.id),
        tickets: emailTicketData.tickets,
        attachments: bookingAttachments,
      }),
    },
    {
      name: "organizerBookingNotificationEmail",
      payload: organizerBookingNotificationEmail({
        organizer: previewOrganizer,
        attendee,
        event,
        booking,
      }),
    },
    {
      name: "paymentFailedEmail",
      payload: paymentFailedEmail({
        attendee,
        event,
        reason: "Payment amount or currency did not match the event price",
      }),
    },
    {
      name: "paymentExpiredEmail",
      payload: paymentExpiredEmail({ attendee, event }),
    },
    {
      name: "bookingCancelledEmail",
      payload: bookingCancelledEmail({ attendee, event }),
    },
    {
      name: "organizerBookingCancelledEmail",
      payload: organizerBookingCancelledEmail({
        organizer: previewOrganizer,
        attendee,
        event,
      }),
    },
    {
      name: "eventUpdatedEmail",
      payload: eventUpdatedEmail({
        attendee,
        beforeEvent,
        afterEvent: event,
      }),
    },
    {
      name: "eventDeletedEmail",
      payload: eventDeletedEmail({ attendee, event }),
    },
    {
      name: "passwordResetEmail",
      payload: passwordResetEmail({
        user: attendee,
        resetUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=preview-token`,
        expiresInMinutes: 60,
      }),
    },
  ];
}

async function main() {
  const { to } = parsePreviewArgs(process.argv.slice(2));
  const emails = await buildPreviewEmails(to);

  for (const email of emails) {
    await sendPreview(email);
  }
}

const isDirectRun = process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
