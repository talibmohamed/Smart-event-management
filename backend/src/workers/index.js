import dotenv from "dotenv";
import { createServer } from "http";
import { createNotificationWorker } from "../queues/notificationQueue.js";
import { createReminderEmailWorker } from "../queues/reminderQueue.js";
import { sendReminderEmailForDelivery, startReminderWorker } from "../services/reminderService.js";
import { initializeSocketServer } from "../utils/socket.js";

dotenv.config();

const socketServer = createServer();
initializeSocketServer(socketServer);

const stopScanner = startReminderWorker();
const reminderEmailWorker = createReminderEmailWorker(({ deliveryId }) =>
  sendReminderEmailForDelivery(deliveryId)
);
const notificationWorker = createNotificationWorker();

if (notificationWorker) {
  socketServer.listen(process.env.NOTIFICATION_WORKER_SOCKET_PORT || 0, () => {
    const address = socketServer.address();
    console.log(JSON.stringify({
      scope: "workers",
      action: "notification_socket_started",
      port: typeof address === "object" && address ? address.port : 0,
    }));
  });
}

const shutdown = async () => {
  await stopScanner();

  if (reminderEmailWorker) {
    await reminderEmailWorker.close();
  }

  if (notificationWorker) {
    await notificationWorker.close();
  }

  socketServer.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
