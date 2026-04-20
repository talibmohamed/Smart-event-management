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

let notificationSocket = null;

const notificationService = {
  getNotifications({ status = "all", limit = 20 } = {}) {
    return api.get("/notifications", {
      params: { status, limit },
    });
  },

  markRead(id) {
    return api.patch(`/notifications/${id}/read`);
  },

  markAllRead() {
    return api.patch("/notifications/read-all");
  },

  connect({ token, onNotification }) {
    if (!token || typeof onNotification !== "function") {
      return () => {};
    }

    if (notificationSocket) {
      notificationSocket.off("notification:new");
      notificationSocket.disconnect();
    }

    notificationSocket = io(getSocketBaseUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    notificationSocket.on("notification:new", onNotification);

    const socket = notificationSocket;

    return () => {
      socket.off("notification:new", onNotification);
      socket.disconnect();

      if (notificationSocket === socket) {
        notificationSocket = null;
      }
    };
  },
};

export default notificationService;
