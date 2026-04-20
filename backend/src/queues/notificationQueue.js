import { Queue, Worker } from "bullmq";
import { createRedisConnection, isRedisEnabled } from "../config/redis.js";
import Notification from "../models/Notification.js";
import { emitNotificationToUser } from "../utils/socket.js";

const DEFAULT_QUEUE_NAME = "notification-delivery";

let notificationQueue;

export const getNotificationQueueName = () =>
  process.env.NOTIFICATION_QUEUE_NAME || DEFAULT_QUEUE_NAME;

export const createNotificationJobId = (notificationId) =>
  `notification:${notificationId}`;

export const getNotificationQueue = () => {
  if (!isRedisEnabled()) {
    return null;
  }

  if (!notificationQueue) {
    notificationQueue = new Queue(getNotificationQueueName(), {
      connection: createRedisConnection(),
    });
  }

  return notificationQueue;
};

export const enqueueNotificationJob = async ({
  notification,
  notificationId = notification?.id,
  queue = getNotificationQueue(),
}) => {
  if (!notificationId) {
    return {
      queued: false,
      jobId: null,
    };
  }

  if (!queue) {
    emitNotificationToUser(notification.user_id, notification);

    return {
      queued: false,
      jobId: null,
    };
  }

  const jobId = createNotificationJobId(notificationId);

  await queue.add(
    "emit-notification",
    { notificationId },
    {
      jobId,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 10000,
      },
      removeOnComplete: true,
      removeOnFail: true,
    }
  );

  return {
    queued: true,
    jobId,
  };
};

export const processNotificationJob = async ({ notificationId }) => {
  const notification = await Notification.getNotificationById(notificationId);

  if (!notification) {
    return {
      emitted: false,
      reason: "notification_not_found",
    };
  }

  emitNotificationToUser(notification.user_id, notification);

  return {
    emitted: true,
  };
};

export const createNotificationWorker = () => {
  if (!isRedisEnabled() || process.env.QUEUE_WORKER_ENABLED === "false") {
    return null;
  }

  return new Worker(
    getNotificationQueueName(),
    async (job) => processNotificationJob(job.data),
    {
      connection: createRedisConnection(),
      concurrency: Number(process.env.NOTIFICATION_WORKER_CONCURRENCY || 10),
    }
  );
};

export const closeNotificationQueue = async () => {
  if (notificationQueue) {
    await notificationQueue.close();
    notificationQueue = null;
  }
};

export default {
  getNotificationQueueName,
  createNotificationJobId,
  getNotificationQueue,
  enqueueNotificationJob,
  processNotificationJob,
  createNotificationWorker,
  closeNotificationQueue,
};
