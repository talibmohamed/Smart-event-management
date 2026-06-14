import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockReq, createMockRes, mockUser } from "../../test/setup.js";

vi.mock("../../models/Booking.js", () => ({
  default: {
    getBookingConversationContextById: vi.fn(),
  },
}));

vi.mock("../../models/Conversation.js", () => ({
  default: {
    listConversationsForUser: vi.fn(),
    countUnreadMessagesForUser: vi.fn(),
    getConversationById: vi.fn(),
    createOrGetConversation: vi.fn(),
    createMessage: vi.fn(),
    getConversationSummaryById: vi.fn(),
    markConversationRead: vi.fn(),
  },
}));

vi.mock("../../services/notificationService.js", () => ({
  default: {
    createForRecipients: vi.fn(),
  },
}));

vi.mock("../../utils/socket.js", () => ({
  emitConversationMessage: vi.fn(),
  emitConversationRead: vi.fn(),
  emitConversationSummaryUpdated: vi.fn(),
}));

const { default: Booking } = await import("../../models/Booking.js");
const { default: Conversation } = await import("../../models/Conversation.js");
const { default: notificationService } = await import("../../services/notificationService.js");
const socketUtils = await import("../../utils/socket.js");
const conversationController = (await import("../conversationController.js")).default;

const mockConversation = (overrides = {}) => ({
  id: "conversation-1",
  booking_id: "booking-1",
  unread_count: 0,
  booking: {
    id: "booking-1",
    status: "confirmed",
    payment_status: "paid",
  },
  event: {
    id: "event-1",
    title: "AI Workshop",
    event_date: new Date("2026-05-01T10:00:00.000Z"),
    city: "Paris",
    image_url: null,
  },
  attendee: {
    id: "attendee-1",
    first_name: "Attendee",
    last_name: "User",
    email: "attendee@example.com",
  },
  organizer: {
    id: "organizer-1",
    first_name: "Organizer",
    last_name: "User",
    email: "organizer@example.com",
  },
  messages: [],
  ...overrides,
});

describe("conversation controller", () => {
  beforeEach(() => {
    Booking.getBookingConversationContextById.mockResolvedValue({
      id: "booking-1",
      user_id: "attendee-1",
      status: "confirmed",
      user: {
        id: "attendee-1",
      },
      event: {
        id: "event-1",
        title: "AI Workshop",
        organizer_id: "organizer-1",
      },
      conversation: null,
    });
    Conversation.listConversationsForUser.mockResolvedValue([mockConversation()]);
    Conversation.countUnreadMessagesForUser.mockResolvedValue(1);
    Conversation.getConversationById.mockResolvedValue(mockConversation());
    Conversation.createOrGetConversation.mockResolvedValue(mockConversation());
    Conversation.createMessage.mockResolvedValue({
      id: "message-1",
      conversation_id: "conversation-1",
      sender_id: "attendee-1",
      body: "Hello organizer",
      created_at: new Date("2026-05-01T11:00:00.000Z"),
      read_at: null,
      sender: {
        id: "attendee-1",
        first_name: "Attendee",
        last_name: "User",
        email: "attendee@example.com",
      },
    });
    Conversation.getConversationSummaryById.mockResolvedValue(mockConversation());
    Conversation.markConversationRead.mockResolvedValue({ read_count: 2 });
    notificationService.createForRecipients.mockResolvedValue([]);
  });

  it("allows attendee to open a conversation for their own booking", async () => {
    const req = createMockReq({
      body: { booking_id: "booking-1" },
      user: mockUser({ id: "attendee-1", role: "attendee" }),
    });
    const res = createMockRes();

    await conversationController.openConversation(req, res);

    expect(Conversation.createOrGetConversation).toHaveBeenCalledWith({
      booking_id: "booking-1",
      event_id: "event-1",
      attendee_id: "attendee-1",
      organizer_id: "organizer-1",
      viewer_id: "attendee-1",
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("blocks attendee from opening another user's booking conversation", async () => {
    const req = createMockReq({
      body: { booking_id: "booking-1" },
      user: mockUser({ id: "attendee-2", role: "attendee" }),
    });
    const res = createMockRes();

    await conversationController.openConversation(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Access denied. You can only open conversations for your own bookings",
    });
  });

  it("blocks admins from opening conversations", async () => {
    const req = createMockReq({
      body: { booking_id: "booking-1" },
      user: mockUser({ id: "admin-1", role: "admin" }),
    });
    const res = createMockRes();

    await conversationController.openConversation(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(Booking.getBookingConversationContextById).not.toHaveBeenCalled();
  });

  it("rejects creating a new conversation for a cancelled booking", async () => {
    Booking.getBookingConversationContextById.mockResolvedValue({
      id: "booking-1",
      user_id: "attendee-1",
      status: "cancelled",
      user: { id: "attendee-1" },
      event: { id: "event-1", organizer_id: "organizer-1" },
      conversation: null,
    });
    const req = createMockReq({
      body: { booking_id: "booking-1" },
      user: mockUser({ id: "attendee-1", role: "attendee" }),
    });
    const res = createMockRes();

    await conversationController.openConversation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Cancelled bookings cannot create new conversations",
    });
  });

  it("lists organizer conversations with unread count", async () => {
    const req = createMockReq({
      user: mockUser({ id: "organizer-1", role: "organizer" }),
    });
    const res = createMockRes();

    await conversationController.listConversations(req, res);

    expect(Conversation.listConversationsForUser).toHaveBeenCalledWith({
      user_id: "organizer-1",
      role: "organizer",
      scope: "own",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Conversations retrieved successfully",
      data: {
        conversations: [mockConversation()],
        total_unread_count: 1,
      },
    });
  });

  it("blocks reading another user's conversation", async () => {
    const req = createMockReq({
      params: { id: "conversation-1" },
      user: mockUser({ id: "attendee-2", role: "attendee" }),
    });
    const res = createMockRes();

    await conversationController.getConversation(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("sends a message, creates a notification, and emits realtime updates", async () => {
    const req = createMockReq({
      params: { id: "conversation-1" },
      body: { body: "Hello organizer" },
      user: mockUser({ id: "attendee-1", role: "attendee", first_name: "Attendee", last_name: "User" }),
    });
    const res = createMockRes();

    await conversationController.sendMessage(req, res);

    expect(Conversation.createMessage).toHaveBeenCalledWith({
      conversation_id: "conversation-1",
      sender_id: "attendee-1",
      body: "Hello organizer",
    });
    expect(notificationService.createForRecipients).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientIds: ["organizer-1"],
        type: "conversation_message",
      }),
    );
    expect(socketUtils.emitConversationMessage).toHaveBeenCalled();
    expect(socketUtils.emitConversationSummaryUpdated).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("blocks admins from sending conversation messages", async () => {
    const req = createMockReq({
      params: { id: "conversation-1" },
      body: { body: "Hello" },
      user: mockUser({ id: "admin-1", role: "admin" }),
    });
    const res = createMockRes();

    await conversationController.sendMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(Conversation.createMessage).not.toHaveBeenCalled();
  });

  it("marks a conversation as read", async () => {
    const req = createMockReq({
      params: { id: "conversation-1" },
      user: mockUser({ id: "attendee-1", role: "attendee" }),
    });
    const res = createMockRes();

    await conversationController.markConversationRead(req, res);

    expect(Conversation.markConversationRead).toHaveBeenCalledWith({
      conversation_id: "conversation-1",
      user_id: "attendee-1",
    });
    expect(socketUtils.emitConversationRead).toHaveBeenCalledWith({
      conversation_id: "conversation-1",
      user_id: "attendee-1",
      unread_count: 0,
      total_unread_count: 1,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
