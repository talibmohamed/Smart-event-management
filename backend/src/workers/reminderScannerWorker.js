import dotenv from "dotenv";
import { createReminderEmailWorker } from "../queues/reminderQueue.js";
import { sendReminderEmailForDelivery, startReminderWorker } from "../services/reminderService.js";

dotenv.config();

const stopWorker = startReminderWorker();
const reminderEmailWorker = createReminderEmailWorker(({ deliveryId }) =>
  sendReminderEmailForDelivery(deliveryId)
);

const shutdown = async () => {
  await stopWorker();

  if (reminderEmailWorker) {
    await reminderEmailWorker.close();
  }

  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
