import prisma from "../config/prisma.js";
import { isRedisEnabled } from "../config/redis.js";
import { enqueueNotificationJob } from "../queues/notificationQueue.js";
import { enqueueReminderEmailJob } from "../queues/reminderQueue.js";
import { sendEmail } from "../utils/emailService.js";
import { eventReminderEmail } from "../utils/emailTemplates.js";

const REMINDER_LOCK_ID = 918273645;
const REMINDER_CONFIGS = [
  {
    key: "24h",
    type: "event_reminder_24h",
    label: "in 24 hours",
    offsetMs: 24 * 60 * 60 * 1000,
  },
  {
    key: "1h",
    type: "event_reminder_1h",
    label: "in 1 hour",
    offsetMs: 60 * 60 * 1000,
  },
];

const toInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const scanIntervalMs = () => toInt(process.env.REMINDER_SCAN_INTERVAL_MS, 300000);
const safetyBufferMs = () => toInt(process.env.REMINDER_SCAN_SAFETY_BUFFER_MS, 60000);
const maxEmailRetries = () => toInt(process.env.REMINDER_EMAIL_MAX_RETRIES, 3);

const firstFrontendUrl = () =>
  (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")[0]
    .trim()
    .replace(/\/$/, "");

const formatNotification = (notification) => ({
  id: notification.id,
  user_id: notification.user_id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  data: notification.data || {},
  read_at: notification.read_at,
  created_at: notification.created_at,
});

const getReminderConfig = (reminderKey) =>
  REMINDER_CONFIGS.find((config) => config.key === reminderKey);

const logReminder = (payload) => {
  console.log(JSON.stringify({ scope: "reminders", ...payload }));
};

export async function findDueReminderCandidates({
  tx = prisma,
  windowStart,
  windowEnd,
}) {
  const candidates = [];

  for (const config of REMINDER_CONFIGS) {
    const eventStartFrom = new Date(windowStart.getTime() + config.offsetMs);
    const eventStartTo = new Date(windowEnd.getTime() + config.offsetMs);

    const bookings = await tx.booking.findMany({
      where: {
        status: "confirmed",
        event: {
          event_date: {
            gte: eventStartFrom,
            lte: eventStartTo,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        event: true,
      },
    });

    candidates.push(
      ...bookings.map((booking) => ({
        reminderKey: config.key,
        config,
        booking,
        event: booking.event,
        attendee: booking.user,
        scheduledFor: new Date(
          new Date(booking.event.event_date).getTime() - config.offsetMs
        ),
      }))
    );
  }

  return candidates;
}

export async function processReminderDelivery(candidate, tx = prisma) {
  const { reminderKey, config, booking, event, attendee, scheduledFor } = candidate;

  try {
    const delivery = await tx.eventReminderDelivery.create({
      data: {
        event_id: event.id,
        booking_id: booking.id,
        user_id: attendee.id,
        reminder_key: reminderKey,
        scheduled_for: scheduledFor,
      },
    });

    const notification = await tx.notification.create({
      data: {
        user_id: attendee.id,
        type: config.type,
        title: "Event reminder",
        message: `${event.title} starts ${config.label}`,
        data: {
          event_id: event.id,
          booking_id: booking.id,
          reminder_key: reminderKey,
        },
        dedupe_key: `${config.type}:${attendee.id}:event:${event.id}:booking:${booking.id}`,
      },
    });

    const updatedDelivery = await tx.eventReminderDelivery.update({
      where: { id: delivery.id },
      data: {
        notification_id: notification.id,
        sent_at: new Date(),
      },
    });

    return {
      created: true,
      skipped: false,
      delivery: updatedDelivery,
      notification: formatNotification(notification),
      emailContext: {
        deliveryId: updatedDelivery.id,
        attendee,
        event,
        reminderLabel: config.label,
      },
    };
  } catch (error) {
    if (error.code === "P2002") {
      return {
        created: false,
        skipped: true,
      };
    }

    throw error;
  }
}

export async function attemptReminderEmail({
  deliveryId,
  attendee,
  event,
  reminderLabel,
}) {
  try {
    await sendEmail(
      eventReminderEmail({
        attendee,
        event,
        reminderLabel,
        eventUrl: `${firstFrontendUrl()}/events/${event.id}`,
      })
    );

    await prisma.eventReminderDelivery.update({
      where: { id: deliveryId },
      data: {
        email_sent: true,
        last_attempt_at: new Date(),
        last_error: null,
      },
    });

    return { sent: true };
  } catch (error) {
    await prisma.eventReminderDelivery.update({
      where: { id: deliveryId },
      data: {
        email_sent: false,
        retry_count: {
          increment: 1,
        },
        last_attempt_at: new Date(),
        last_error: error.message,
      },
    });

    return { sent: false, error };
  }
}

export async function sendReminderEmailForDelivery(deliveryId) {
  const delivery = await prisma.eventReminderDelivery.findUnique({
    where: { id: deliveryId },
    include: {
      event: true,
      user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      },
    },
  });

  if (!delivery) {
    return {
      sent: false,
      reason: "delivery_not_found",
    };
  }

  if (delivery.email_sent) {
    return {
      sent: true,
      reason: "already_sent",
    };
  }

  if (delivery.retry_count >= maxEmailRetries()) {
    return {
      sent: false,
      reason: "max_retries_reached",
    };
  }

  const config = getReminderConfig(delivery.reminder_key);

  if (!config) {
    return {
      sent: false,
      reason: "unknown_reminder_key",
    };
  }

  return attemptReminderEmail({
    deliveryId: delivery.id,
    attendee: delivery.user,
    event: delivery.event,
    reminderLabel: config.label,
  });
}

async function retryFailedReminderEmails() {
  const retryCutoff = new Date(Date.now() - scanIntervalMs());
  const deliveries = await prisma.eventReminderDelivery.findMany({
    where: {
      email_sent: false,
      sent_at: {
        not: null,
      },
      retry_count: {
        lt: maxEmailRetries(),
      },
      OR: [
        { last_attempt_at: null },
        { last_attempt_at: { lt: retryCutoff } },
      ],
    },
    include: {
      event: true,
      user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      },
    },
    take: 25,
    orderBy: {
      last_attempt_at: "asc",
    },
  });

  let emailFailures = 0;

  for (const delivery of deliveries) {
    const result = isRedisEnabled()
      ? await enqueueReminderEmailJob({ deliveryId: delivery.id })
      : await sendReminderEmailForDelivery(delivery.id);

    if (result.sent === false) {
      emailFailures += 1;
    }
  }

  return {
    attempted: deliveries.length,
    emailFailures,
  };
}

async function runReminderScan({ previousScanAt = null } = {}) {
  const cycleStartedAt = new Date();
  const windowStart = previousScanAt
    ? new Date(previousScanAt.getTime() - safetyBufferMs())
    : new Date(cycleStartedAt.getTime() - scanIntervalMs() - safetyBufferMs());
  const windowEnd = new Date(cycleStartedAt.getTime() + safetyBufferMs());

  const scanResult = await prisma.$transaction(async (tx) => {
    const lockRows = await tx.$queryRaw`
      SELECT pg_try_advisory_xact_lock(${REMINDER_LOCK_ID}) AS locked
    `;
    const lockAcquired = Boolean(lockRows[0]?.locked);

    if (!lockAcquired) {
      return {
        lockAcquired: false,
        candidates: 0,
        created: 0,
        skipped: 0,
        emitPayloads: [],
        emailContexts: [],
      };
    }

    const candidates = await findDueReminderCandidates({
      tx,
      windowStart,
      windowEnd,
    });
    const emitPayloads = [];
    const emailContexts = [];
    let created = 0;
    let skipped = 0;

    for (const candidate of candidates) {
      const result = await processReminderDelivery(candidate, tx);

      if (result.created) {
        created += 1;
        emitPayloads.push(result.notification);
        emailContexts.push(result.emailContext);
      } else if (result.skipped) {
        skipped += 1;
      }
    }

    return {
      lockAcquired: true,
      candidates: candidates.length,
      created,
      skipped,
      emitPayloads,
      emailContexts,
    };
  });

  if (!scanResult.lockAcquired) {
    logReminder({
      action: "scan_cycle",
      lock_acquired: false,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      candidate_count: scanResult.candidates,
      deliveries_created: 0,
      deliveries_skipped_by_dedupe: 0,
      emit_failures: 0,
      email_failures: 0,
      email_retries_attempted: 0,
    });

    return {
      cycleStartedAt,
      lockAcquired: false,
    };
  }

  let emitFailures = 0;
  let emailFailures = 0;

  for (const notification of scanResult.emitPayloads) {
    try {
      await enqueueNotificationJob({ notification });
    } catch (error) {
      emitFailures += 1;
      console.error("Reminder notification delivery enqueue failed:", error);
    }
  }

  for (const emailContext of scanResult.emailContexts) {
    const result = isRedisEnabled()
      ? await enqueueReminderEmailJob({ deliveryId: emailContext.deliveryId })
      : await attemptReminderEmail(emailContext);

    if (result.sent === false) {
      emailFailures += 1;
    }
  }

  const retryResult = await retryFailedReminderEmails();

  logReminder({
    action: "scan_cycle",
    lock_acquired: scanResult.lockAcquired,
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
    candidate_count: scanResult.candidates,
    deliveries_created: scanResult.created,
    deliveries_skipped_by_dedupe: scanResult.skipped,
    emit_failures: emitFailures,
    email_failures: emailFailures + retryResult.emailFailures,
    email_retries_attempted: retryResult.attempted,
  });

  return {
    cycleStartedAt,
    lockAcquired: scanResult.lockAcquired,
  };
}

export function startReminderWorker() {
  if (process.env.REMINDER_WORKER_ENABLED === "false" || process.env.NODE_ENV === "test") {
    logReminder({ action: "worker_disabled" });
    return () => {};
  }

  let previousScanAt = null;
  let isRunning = false;

  const runCycle = async () => {
    if (isRunning) {
      logReminder({ action: "scan_skipped", reason: "cycle_already_running" });
      return;
    }

    isRunning = true;

    try {
      const result = await runReminderScan({ previousScanAt });
      previousScanAt = result.cycleStartedAt;
    } catch (error) {
      console.error("Reminder scan failed:", error);
    } finally {
      isRunning = false;
    }
  };

  runCycle();
  const interval = setInterval(runCycle, scanIntervalMs());

  logReminder({
    action: "worker_started",
    scan_interval_ms: scanIntervalMs(),
    safety_buffer_ms: safetyBufferMs(),
  });

  return () => clearInterval(interval);
}

export default {
  findDueReminderCandidates,
  processReminderDelivery,
  sendReminderEmailForDelivery,
  startReminderWorker,
};
