import Booking from "../models/Booking.js";
import Conversation from "../models/Conversation.js";
import notificationService from "../services/notificationService.js";
import {
  emitConversationMessage,
  emitConversationRead,
  emitConversationSummaryUpdated,
} from "../utils/socket.js";

const LIST_SCOPE_ALL = "all";
const ALLOWED_OPEN_BOOKING_STATUSES = new Set(["confirmed", "pending_payment"]);

const canUserAccessConversation = ({ conversation, user }) => {
  if (!conversation || !user) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  if (user.role === "organizer") {
    return conversation.organizer?.id === user.id;
  }

  return conversation.attendee?.id === user.id;
};

const getCounterpartUser = ({ conversation, user }) => {
  if (user.role === "organizer") {
    return conversation.attendee;
  }

  return conversation.organizer;
};

const getRecipientUserId = ({ conversation, sender_id }) =>
  sender_id === conversation.organizer.id ? conversation.attendee.id : conversation.organizer.id;

const getFullName = (user = {}) =>
  `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "A user";

const listConversations = async (req, res) => {
  try {
    const scope = req.query.scope || "own";

    if (req.user.role === "admin" && !["own", LIST_SCOPE_ALL].includes(scope)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation scope",
      });
    }

    const effectiveScope =
      req.user.role === "admin" && scope === LIST_SCOPE_ALL ? LIST_SCOPE_ALL : "own";

    const [conversations, totalUnreadCount] = await Promise.all([
      Conversation.listConversationsForUser({
        user_id: req.user.id,
        role: req.user.role,
        scope: effectiveScope,
      }),
      Conversation.countUnreadMessagesForUser(req.user.id),
    ]);

    return res.status(200).json({
      success: true,
      message: "Conversations retrieved successfully",
      data: {
        conversations,
        total_unread_count: totalUnreadCount,
      },
    });
  } catch (error) {
    console.error("List conversations error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching conversations",
      error: error.message,
    });
  }
};

const getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.getConversationById({
      conversation_id: req.params.id,
      viewer_id: req.user.id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    if (!canUserAccessConversation({ conversation, user: req.user })) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view conversations you are part of",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conversation retrieved successfully",
      data: {
        conversation,
      },
    });
  } catch (error) {
    console.error("Get conversation error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching conversation",
      error: error.message,
    });
  }
};

const openConversation = async (req, res) => {
  try {
    const bookingId = req.body?.booking_id;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    if (req.user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins can only read conversations",
      });
    }

    const booking = await Booking.getBookingConversationContextById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (req.user.role === "attendee" && booking.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only open conversations for your own bookings",
      });
    }

    if (req.user.role === "organizer" && booking.event.organizer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only open conversations for your own events",
      });
    }

    if (!ALLOWED_OPEN_BOOKING_STATUSES.has(booking.status) && !booking.conversation?.id) {
      return res.status(400).json({
        success: false,
        message: "Cancelled bookings cannot create new conversations",
      });
    }

    const conversation = await Conversation.createOrGetConversation({
      booking_id: booking.id,
      event_id: booking.event.id,
      attendee_id: booking.user.id,
      organizer_id: booking.event.organizer_id,
      viewer_id: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: booking.conversation?.id
        ? "Conversation retrieved successfully"
        : "Conversation opened successfully",
      data: {
        conversation,
      },
    });
  } catch (error) {
    console.error("Open conversation error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while opening conversation",
      error: error.message,
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins can only read conversations",
      });
    }

    const body = String(req.body?.body || "").trim();

    if (!body) {
      return res.status(400).json({
        success: false,
        message: "Message body is required",
      });
    }

    const conversation = await Conversation.getConversationById({
      conversation_id: req.params.id,
      viewer_id: req.user.id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    if (!canUserAccessConversation({ conversation, user: req.user })) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only send messages in conversations you are part of",
      });
    }

    const message = await Conversation.createMessage({
      conversation_id: conversation.id,
      sender_id: req.user.id,
      body,
    });
    const recipientUserId = getRecipientUserId({
      conversation,
      sender_id: req.user.id,
    });
    const senderName = getFullName(message.sender);

    await notificationService.createForRecipients({
      recipientIds: [recipientUserId],
      type: "conversation_message",
      title: "New message",
      message: `${senderName} sent a message about ${conversation.event.title}`,
      data: {
        conversation_id: conversation.id,
        event_id: conversation.event.id,
        booking_id: conversation.booking.id,
        sender_id: req.user.id,
      },
      dedupeKey: `conversation:${conversation.id}:message:${message.id}`,
    });

    const [senderSummary, recipientSummary] = await Promise.all([
      Conversation.getConversationSummaryById({
        conversation_id: conversation.id,
        viewer_id: req.user.id,
      }),
      Conversation.getConversationSummaryById({
        conversation_id: conversation.id,
        viewer_id: recipientUserId,
      }),
    ]);

    emitConversationMessage({
      conversation_id: conversation.id,
      message,
    });

    if (senderSummary) {
      emitConversationSummaryUpdated({
        user_id: req.user.id,
        conversation: senderSummary,
      });
    }

    if (recipientSummary) {
      emitConversationSummaryUpdated({
        user_id: recipientUserId,
        conversation: recipientSummary,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: {
        message,
        conversation: senderSummary,
      },
    });
  } catch (error) {
    console.error("Send conversation message error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while sending message",
      error: error.message,
    });
  }
};

const markConversationRead = async (req, res) => {
  try {
    const conversation = await Conversation.getConversationById({
      conversation_id: req.params.id,
      viewer_id: req.user.id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    if (!canUserAccessConversation({ conversation, user: req.user })) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update conversations you are part of",
      });
    }

    const { read_count } = await Conversation.markConversationRead({
      conversation_id: conversation.id,
      user_id: req.user.id,
    });
    const totalUnreadCount = await Conversation.countUnreadMessagesForUser(req.user.id);

    emitConversationRead({
      conversation_id: conversation.id,
      user_id: req.user.id,
      unread_count: 0,
      total_unread_count: totalUnreadCount,
    });

    return res.status(200).json({
      success: true,
      message: "Conversation marked as read",
      data: {
        conversation_id: conversation.id,
        read_count,
        unread_count: 0,
        total_unread_count: totalUnreadCount,
      },
    });
  } catch (error) {
    console.error("Mark conversation read error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating conversation",
      error: error.message,
    });
  }
};

export default {
  listConversations,
  getConversation,
  openConversation,
  sendMessage,
  markConversationRead,
};
