import { Queue, Worker } from "bullmq";
import { createRedisConnection, isRedisEnabled } from "../config/redis.js";

const DEFAULT_QUEUE_NAME = "reminder-delivery";

let reminderEmailQueue;

export const getReminderQueueName = () =>
  process.env.REMINDER_QUEUE_NAME || DEFAULT_QUEUE_NAME;

export const createReminderEmailJobId = (deliveryId) =>
  `reminder-email:${deliveryId}`;

export const getReminderEmailQueue = () => {
  if (!isRedisEnabled()) {
    return null;
  }

  if (!reminderEmailQueue) {
    reminderEmailQueue = new Queue(getReminderQueueName(), {
      connection: createRedisConnection(),
    });
  }

  return reminderEmailQueue;
};

export const enqueueReminderEmailJob = async ({ deliveryId, queue = getReminderEmailQueue() }) => {
  if (!queue) {
    return {
      queued: false,
      jobId: null,
    };
  }

  const jobId = createReminderEmailJobId(deliveryId);

  await queue.add(
    "send-reminder-email",
    { deliveryId },
    {
      jobId,
      attempts: Number(process.env.REMINDER_EMAIL_MAX_RETRIES || 3),
      backoff: {
        type: "exponential",
        delay: 60000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  return {
    queued: true,
    jobId,
  };
};

export const createReminderEmailWorker = (processor) => {
  if (!isRedisEnabled() || process.env.QUEUE_WORKER_ENABLED === "false") {
    return null;
  }

  return new Worker(
    getReminderQueueName(),
    async (job) => processor(job.data),
    {
      connection: createRedisConnection(),
      concurrency: Number(process.env.REMINDER_EMAIL_WORKER_CONCURRENCY || 5),
    }
  );
};

export const closeReminderQueue = async () => {
  if (reminderEmailQueue) {
    await reminderEmailQueue.close();
    reminderEmailQueue = null;
  }
};

export default {
  getReminderQueueName,
  createReminderEmailJobId,
  getReminderEmailQueue,
  enqueueReminderEmailJob,
  createReminderEmailWorker,
  closeReminderQueue,
};
