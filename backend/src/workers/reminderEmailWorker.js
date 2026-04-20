import dotenv from "dotenv";
import { createReminderEmailWorker } from "../queues/reminderQueue.js";
import { sendReminderEmailForDelivery } from "../services/reminderService.js";

dotenv.config();

const worker = createReminderEmailWorker(({ deliveryId }) =>
  sendReminderEmailForDelivery(deliveryId)
);

if (!worker) {
  console.log("Reminder email worker disabled.");
} else {
  worker.on("completed", (job) => {
    console.log(JSON.stringify({
      scope: "reminder_email_worker",
      action: "completed",
      job_id: job.id,
    }));
  });

  worker.on("failed", (job, error) => {
    console.error("Reminder email worker job failed:", {
      job_id: job?.id,
      error: error.message,
    });
  });
}

const shutdown = async () => {
  if (worker) {
    await worker.close();
  }

  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
