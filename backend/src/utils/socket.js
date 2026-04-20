import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createSocketRedisClients, isRedisEnabled } from "../config/redis.js";

let io;

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
  });

  return io;
};

export const emitNotificationToUser = (userId, notification) => {
  if (!io) {
    return;
  }

  io.to(`user:${userId}`).emit("notification:new", notification);
};

export const getSocketServer = () => io;
