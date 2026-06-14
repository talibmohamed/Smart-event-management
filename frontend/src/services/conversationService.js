import { io } from "socket.io-client";
import api from "./api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

function getSocketBaseUrl() {
  try {
    const url = new URL(API_BASE_URL, window.location.origin);
    url.pathname = url.pathname.replace(/\/api\/?$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return "http://localhost:5000";
  }
}

let conversationSocket = null;

const conversationService = {
  listConversations({ scope } = {}) {
    const config = scope ? { params: { scope } } : undefined;
    return api.get("/conversations", config);
  },

  getConversation(id) {
    return api.get(`/conversations/${id}`);
  },

  openConversation(bookingId) {
    return api.post("/conversations", {
      booking_id: bookingId,
    });
  },

  sendMessage(conversationId, body) {
    return api.post(`/conversations/${conversationId}/messages`, { body });
  },

  markRead(conversationId) {
    return api.patch(`/conversations/${conversationId}/read`);
  },

  connect({ token, onMessage, onSummaryUpdate, onRead }) {
    if (!token) {
      return {
        joinConversation() {},
        leaveConversation() {},
        disconnect() {},
      };
    }

    if (conversationSocket) {
      conversationSocket.off("conversation:message:new");
      conversationSocket.off("conversation:summary:updated");
      conversationSocket.off("conversation:read");
      conversationSocket.disconnect();
    }

    conversationSocket = io(getSocketBaseUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    if (typeof onMessage === "function") {
      conversationSocket.on("conversation:message:new", onMessage);
    }

    if (typeof onSummaryUpdate === "function") {
      conversationSocket.on("conversation:summary:updated", onSummaryUpdate);
    }

    if (typeof onRead === "function") {
      conversationSocket.on("conversation:read", onRead);
    }

    const socket = conversationSocket;

    return {
      joinConversation(conversationId) {
        if (!conversationId) {
          return;
        }

        socket.emit("conversation:join", {
          conversation_id: conversationId,
        });
      },

      leaveConversation(conversationId) {
        if (!conversationId) {
          return;
        }

        socket.emit("conversation:leave", {
          conversation_id: conversationId,
        });
      },

      disconnect() {
        socket.off("conversation:message:new", onMessage);
        socket.off("conversation:summary:updated", onSummaryUpdate);
        socket.off("conversation:read", onRead);
        socket.disconnect();

        if (conversationSocket === socket) {
          conversationSocket = null;
        }
      },
    };
  },
};

export default conversationService;
