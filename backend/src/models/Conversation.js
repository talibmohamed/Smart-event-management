import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";

const USER_SUMMARY_SELECT = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
};

const EVENT_SUMMARY_SELECT = {
  id: true,
  title: true,
  event_date: true,
  city: true,
  image_url: true,
};

const BOOKING_SUMMARY_SELECT = {
  id: true,
  status: true,
  payment_status: true,
};

const formatMessage = (message) => ({
  id: message.id,
  conversation_id: message.conversation_id,
  sender_id: message.sender_id,
  body: message.body,
  created_at: message.created_at,
  read_at: message.read_at,
  sender: message.sender
    ? {
        id: message.sender.id,
        first_name: message.sender.first_name,
        last_name: message.sender.last_name,
        email: message.sender.email,
      }
    : undefined,
});

const formatConversationSummaryRow = (row) => ({
  id: row.id,
  booking_id: row.booking_id,
  last_message_at: row.last_message_at,
  created_at: row.created_at,
  unread_count: Number(row.unread_count || 0),
  booking: {
    id: row.booking_id,
    status: row.booking_status,
    payment_status: row.booking_payment_status,
  },
  event: {
    id: row.event_id,
    title: row.event_title,
    event_date: row.event_date,
    city: row.event_city,
    image_url: row.event_image_url,
  },
  attendee: {
    id: row.attendee_id,
    first_name: row.attendee_first_name,
    last_name: row.attendee_last_name,
    email: row.attendee_email,
  },
  organizer: {
    id: row.organizer_id,
    first_name: row.organizer_first_name,
    last_name: row.organizer_last_name,
    email: row.organizer_email,
  },
  last_message: row.last_message_id
    ? {
        id: row.last_message_id,
        body: row.last_message_body,
        sender_id: row.last_message_sender_id,
        created_at: row.last_message_created_at,
      }
    : null,
});

const buildConversationListWhere = ({ user_id, role, scope }) => {
  if (role === "admin" && scope === "all") {
    return Prisma.sql`TRUE`;
  }

  if (role === "organizer") {
    return Prisma.sql`c.organizer_id = CAST(${user_id} AS uuid)`;
  }

  return Prisma.sql`c.attendee_id = CAST(${user_id} AS uuid)`;
};

const buildConversationSummaryByIdWhere = ({ conversation_id }) =>
  Prisma.sql`c.id = CAST(${conversation_id} AS uuid)`;

const getConversationSummaryRows = async ({ whereSql, viewer_id }) => {
  return prisma.$queryRaw(
    Prisma.sql`
      SELECT
        c.id,
        c.booking_id,
        c.event_id,
        c.attendee_id,
        c.organizer_id,
        c.last_message_at,
        c.created_at,
        b.status AS booking_status,
        b.payment_status AS booking_payment_status,
        e.title AS event_title,
        e.event_date,
        e.city AS event_city,
        e.image_url AS event_image_url,
        attendee.first_name AS attendee_first_name,
        attendee.last_name AS attendee_last_name,
        attendee.email AS attendee_email,
        organizer.first_name AS organizer_first_name,
        organizer.last_name AS organizer_last_name,
        organizer.email AS organizer_email,
        lm.id AS last_message_id,
        lm.body AS last_message_body,
        lm.sender_id AS last_message_sender_id,
        lm.created_at AS last_message_created_at,
        COALESCE(uc.unread_count, 0)::int AS unread_count
      FROM conversations c
      JOIN bookings b ON b.id = c.booking_id
      JOIN events e ON e.id = c.event_id
      JOIN users attendee ON attendee.id = c.attendee_id
      JOIN users organizer ON organizer.id = c.organizer_id
      LEFT JOIN LATERAL (
        SELECT
          m.id,
          m.body,
          m.sender_id,
          m.created_at
        FROM conversation_messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) lm ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS unread_count
        FROM conversation_messages m
        WHERE m.conversation_id = c.id
          AND m.sender_id <> CAST(${viewer_id} AS uuid)
          AND m.read_at IS NULL
      ) uc ON TRUE
      WHERE ${whereSql}
      ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
    `,
  );
};

const findConversationRecordByBookingId = async (booking_id) => {
  return prisma.conversation.findUnique({
    where: { booking_id },
  });
};

const getConversationAccessSnapshot = async (conversation_id) => {
  return prisma.conversation.findUnique({
    where: { id: conversation_id },
    select: {
      id: true,
      booking_id: true,
      attendee_id: true,
      organizer_id: true,
    },
  });
};

const getConversationSummaryById = async ({ conversation_id, viewer_id }) => {
  const rows = await getConversationSummaryRows({
    whereSql: buildConversationSummaryByIdWhere({ conversation_id }),
    viewer_id,
  });

  return rows[0] ? formatConversationSummaryRow(rows[0]) : null;
};

const listConversationsForUser = async ({ user_id, role, scope = "own" }) => {
  const rows = await getConversationSummaryRows({
    whereSql: buildConversationListWhere({ user_id, role, scope }),
    viewer_id: user_id,
  });

  return rows.map(formatConversationSummaryRow);
};

const getConversationById = async ({ conversation_id, viewer_id }) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversation_id },
    include: {
      booking: {
        select: BOOKING_SUMMARY_SELECT,
      },
      event: {
        select: EVENT_SUMMARY_SELECT,
      },
      attendee: {
        select: USER_SUMMARY_SELECT,
      },
      organizer: {
        select: USER_SUMMARY_SELECT,
      },
      messages: {
        include: {
          sender: {
            select: USER_SUMMARY_SELECT,
          },
        },
        orderBy: {
          created_at: "asc",
        },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  const summary = await getConversationSummaryById({
    conversation_id,
    viewer_id,
  });

  return {
    ...summary,
    messages: conversation.messages.map(formatMessage),
  };
};

const createOrGetConversation = async ({
  booking_id,
  event_id,
  attendee_id,
  organizer_id,
  viewer_id,
}) => {
  const existingConversation = await findConversationRecordByBookingId(booking_id);

  if (existingConversation) {
    return getConversationById({
      conversation_id: existingConversation.id,
      viewer_id,
    });
  }

  const conversation = await prisma.conversation.create({
    data: {
      booking_id,
      event_id,
      attendee_id,
      organizer_id,
      last_message_at: new Date(),
    },
  });

  return getConversationById({
    conversation_id: conversation.id,
    viewer_id,
  });
};

const createMessage = async ({ conversation_id, sender_id, body }) => {
  const createdAt = new Date();

  const message = await prisma.$transaction(async (tx) => {
    const createdMessage = await tx.conversationMessage.create({
      data: {
        conversation_id,
        sender_id,
        body,
        created_at: createdAt,
      },
      include: {
        sender: {
          select: USER_SUMMARY_SELECT,
        },
      },
    });

    await tx.conversation.update({
      where: { id: conversation_id },
      data: {
        last_message_at: createdAt,
      },
    });

    return createdMessage;
  });

  return formatMessage(message);
};

const markConversationRead = async ({ conversation_id, user_id }) => {
  const result = await prisma.conversationMessage.updateMany({
    where: {
      conversation_id,
      sender_id: {
        not: user_id,
      },
      read_at: null,
    },
    data: {
      read_at: new Date(),
    },
  });

  return {
    read_count: Number(result.count || 0),
  };
};

const countUnreadMessagesForUser = async (user_id) => {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT COUNT(*)::int AS total
      FROM conversation_messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.sender_id <> CAST(${user_id} AS uuid)
        AND m.read_at IS NULL
        AND (
          c.attendee_id = CAST(${user_id} AS uuid)
          OR c.organizer_id = CAST(${user_id} AS uuid)
        )
    `,
  );

  return Number(rows[0]?.total || 0);
};

export default {
  findConversationRecordByBookingId,
  getConversationAccessSnapshot,
  getConversationSummaryById,
  listConversationsForUser,
  getConversationById,
  createOrGetConversation,
  createMessage,
  markConversationRead,
  countUnreadMessagesForUser,
};
