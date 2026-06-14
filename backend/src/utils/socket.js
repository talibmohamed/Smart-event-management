import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createSocketRedisClients, isRedisEnabled } from "../config/redis.js";
import Conversation from "../models/Conversation.js";

let io;

const canUserJoinConversation = ({ conversation, user }) => {
  if (!conversation || !user) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  if (user.role === "organizer") {
    return conversation.organizer_id === user.id;
  }

  return conversation.attendee_id === user.id;
};

const getAllowedOrigins = () => {
  const configuredOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([
    ...configuredOrigins,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);
};

export const initializeSocketServer = (httpServer) => {
  const allowedOrigins = getAllowedOrigins();

  io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          return callback(null, true);
        }

        return callback(new Error("Socket origin not allowed"));
      },
      credentials: true,
    },
  });

  if (isRedisEnabled()) {
    const { pubClient, subClient } = createSocketRedisClients();
    io.adapter(createAdapter(pubClient, subClient));
  }

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Not authorized"));
    }

    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      return next();
    } catch {
      return next(new Error("Token invalid"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);

    if (socket.user.role === "admin") {
      socket.join("admins");
    }

    socket.on("conversation:join", async ({ conversation_id } = {}) => {
      if (!conversation_id) {
        return;
      }

      try {
        const conversation = await Conversation.getConversationAccessSnapshot(conversation_id);

        if (!canUserJoinConversation({ conversation, user: socket.user })) {
          return;
        }

        socket.join(`conversation:${conversation_id}`);
      } catch (error) {
        console.error("Conversation join error:", error);
      }
    });

    socket.on("conversation:leave", ({ conversation_id } = {}) => {
      if (!conversation_id) {
        return;
      }

      socket.leave(`conversation:${conversation_id}`);
    });
  });

  return io;
};

export const emitNotificationToUser = (userId, notification) => {
  if (!io) {
    return;
  }

  io.to(`user:${userId}`).emit("notification:new", notification);
};

export const emitConversationMessage = ({ conversation_id, message }) => {
  if (!io || !conversation_id || !message) {
    return;
  }

  io.to(`conversation:${conversation_id}`).emit("conversation:message:new", {
    conversation_id,
    message,
  });
};

export const emitConversationSummaryUpdated = ({ user_id, conversation }) => {
  if (!io || !user_id || !conversation) {
    return;
  }

  io.to(`user:${user_id}`).emit("conversation:summary:updated", {
    conversation,
  });
};

export const emitConversationRead = ({
  conversation_id,
  user_id,
  unread_count,
  total_unread_count,
}) => {
  if (!io || !conversation_id || !user_id) {
    return;
  }

  const payload = {
    conversation_id,
    user_id,
    unread_count,
    total_unread_count,
  };

  io.to(`conversation:${conversation_id}`).emit("conversation:read", payload);
  io.to(`user:${user_id}`).emit("conversation:read", payload);
};

export const getSocketServer = () => io;
