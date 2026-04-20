import dotenv from "dotenv";
import { createServer } from "http";
import { createNotificationWorker } from "../queues/notificationQueue.js";
import { initializeSocketServer } from "../utils/socket.js";

dotenv.config();

const PORT = process.env.NOTIFICATION_WORKER_SOCKET_PORT || 0;
const server = createServer();
initializeSocketServer(server);

const worker = createNotificationWorker();

if (!worker) {
  console.log("Notification worker disabled.");
} else {
  server.listen(PORT, () => {
    const address = server.address();
    console.log(JSON.stringify({
      scope: "notification_worker",
      action: "socket_server_started",
      port: typeof address === "object" && address ? address.port : PORT,
    }));
  });

  worker.on("failed", (job, error) => {
    console.error("Notification worker job failed:", {
      job_id: job?.id,
      error: error.message,
    });
  });
}

const shutdown = async () => {
  if (worker) {
    await worker.close();
  }

  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
