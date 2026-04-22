import prisma from "../config/prisma.js";

const formatFeedback = (feedback) => ({
  id: feedback.id,
  user_id: feedback.user_id,
  event_id: feedback.event_id,
  rating: feedback.rating,
  comment: feedback.comment,
  created_at: feedback.created_at,
  user: feedback.user
    ? {
        first_name: feedback.user.first_name,
        last_name: feedback.user.last_name,
      }
    : undefined,
});

const getEventById = async (eventId) => {
  return prisma.event.findUnique({
    where: { id: eventId },
  });
};

const getConfirmedBooking = async (userId, eventId) => {
  return prisma.booking.findFirst({
    where: {
      user_id: userId,
      event_id: eventId,
      status: "confirmed",
    },
  });
};

const upsertFeedback = async ({ user_id, event_id, rating, comment }) => {
  const feedback = await prisma.feedback.upsert({
    where: {
      user_id_event_id: {
        user_id,
        event_id,
      },
    },
    update: {
      rating,
      comment: comment || null,
    },
    create: {
      user_id,
      event_id,
      rating,
      comment: comment || null,
    },
    include: {
      user: {
        select: {
          first_name: true,
          last_name: true,
        },
      },
    },
  });

  return formatFeedback(feedback);
};

const getFeedbacksByEvent = async (eventId) => {
  const feedbacks = await prisma.feedback.findMany({
    where: { event_id: eventId },
    include: {
      user: {
        select: {
          first_name: true,
          last_name: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return feedbacks.map(formatFeedback);
};

export default {
  getEventById,
  getConfirmedBooking,
  upsertFeedback,
  getFeedbacksByEvent,
};
