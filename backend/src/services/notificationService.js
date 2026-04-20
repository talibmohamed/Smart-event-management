import Notification from "../models/Notification.js";
import { emitNotificationToUser } from "../utils/socket.js";

const uniqueIds = (ids) => [...new Set(ids.filter(Boolean))];

const createForRecipients = async ({ recipientIds, type, title, message, data, dedupeKey }) => {
  const notifications = [];

  for (const userId of uniqueIds(recipientIds)) {
    try {
      const result = await Notification.createNotification({
        user_id: userId,
        type,
        title,
        message,
        data,
        dedupe_key: dedupeKey ? `${type}:${userId}:${dedupeKey}` : null,
      });

      if (result.created && result.notification) {
        emitNotificationToUser(userId, result.notification);
      }

      if (result.notification) {
        notifications.push(result.notification);
      }
    } catch (error) {
      console.error("Notification creation error:", error);
    }
  }

  return notifications;
};

const getAdminIds = async () => Notification.getAdminUserIds();

const getFullName = (user = {}) =>
  `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "An attendee";

const notifyBookingConfirmed = async ({ booking, attendee, event, organizer, stripeEventId }) => {
  if (!booking || !event) {
    return [];
  }

  const adminIds = await getAdminIds();
  const attendeeName = getFullName(attendee);
  const dedupeKey = stripeEventId
    ? `stripe:${stripeEventId}:booking:${booking.id}:confirmed`
    : `booking:${booking.id}:confirmed`;

  return createForRecipients({
    recipientIds: [booking.user_id, attendee?.id, event?.organizer_id, organizer?.id, ...adminIds],
    type: "booking_confirmed",
    title: "Booking confirmed",
    message: `${attendeeName} booked ${event.title}`,
    data: {
      booking_id: booking.id,
      event_id: event.id,
    },
    dedupeKey,
  });
};

const notifyPaymentFailed = async ({ booking, event, reason, stripeEventId }) => {
  if (!booking || !event) {
    return [];
  }

  const adminIds = await getAdminIds();

  return createForRecipients({
    recipientIds: [booking.user_id, ...adminIds],
    type: "payment_failed",
    title: "Payment failed",
    message: `Payment failed for ${event.title}: ${reason}`,
    data: {
      booking_id: booking.id,
      event_id: event.id,
      reason,
    },
    dedupeKey: `payment:${stripeEventId || booking.id}:failed`,
  });
};

const notifyPaymentExpired = async ({ booking, event, stripeEventId }) => {
  if (!booking || !event) {
    return [];
  }

  const adminIds = await getAdminIds();

  return createForRecipients({
    recipientIds: [booking.user_id, ...adminIds],
    type: "payment_expired",
    title: "Payment expired",
    message: `Payment expired for ${event.title}`,
    data: {
      booking_id: booking.id,
      event_id: event.id,
    },
    dedupeKey: `payment:${stripeEventId || booking.id}:expired`,
  });
};

const notifyBookingCancelled = async ({ booking, attendee, event, wasConfirmed }) => {
  if (!booking || !event) {
    return [];
  }

  const adminIds = await getAdminIds();

  return createForRecipients({
    recipientIds: [
      booking.user_id,
      ...(wasConfirmed ? [event.organizer_id] : []),
      ...adminIds,
    ],
    type: "booking_cancelled",
    title: "Booking cancelled",
    message: `${getFullName(attendee)} cancelled a booking for ${event.title}`,
    data: {
      booking_id: booking.id,
      event_id: event.id,
    },
    dedupeKey: `booking:${booking.id}:cancelled`,
  });
};

const notifyEventUpdated = async ({ event, attendeeBookings, changedAt }) => {
  if (!event || !attendeeBookings.length) {
    return [];
  }

  return createForRecipients({
    recipientIds: attendeeBookings.map((booking) => booking.user_id),
    type: "event_updated",
    title: "Event updated",
    message: `${event.title} was updated`,
    data: {
      event_id: event.id,
    },
    dedupeKey: `event:${event.id}:updated:${new Date(changedAt).getTime()}`,
  });
};

const notifyEventDeleted = async ({ event, attendeeBookings, actor }) => {
  if (!event) {
    return [];
  }

  const adminIds = await getAdminIds();

  return createForRecipients({
    recipientIds: [
      ...attendeeBookings.map((booking) => booking.user_id),
      ...(actor?.role === "admin" ? [event.organizer_id] : []),
      ...adminIds,
    ],
    type: "event_deleted",
    title: "Event cancelled",
    message: `${event.title} was cancelled`,
    data: {
      event_id: event.id,
    },
    dedupeKey: `event:${event.id}:deleted`,
  });
};

const notifyTicketCheckedIn = async ({ ticket }) => {
  if (!ticket) {
    return [];
  }

  const adminIds = await getAdminIds();

  return createForRecipients({
    recipientIds: [ticket.user_id, ticket.event?.organizer_id, ...adminIds],
    type: "ticket_checked_in",
    title: "Ticket checked in",
    message: `Ticket checked in for ${ticket.event?.title || "an event"}`,
    data: {
      ticket_code: ticket.ticket_code,
      event_id: ticket.event_id,
      booking_id: ticket.booking_id,
    },
    dedupeKey: `ticket:${ticket.ticket_code}:checked_in`,
  });
};

export default {
  createForRecipients,
  notifyBookingConfirmed,
  notifyPaymentFailed,
  notifyPaymentExpired,
  notifyBookingCancelled,
  notifyEventUpdated,
  notifyEventDeleted,
  notifyTicketCheckedIn,
};
