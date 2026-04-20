import prisma from "../config/prisma.js";

const clampLimit = (value) => {
  const parsed = Number(value || 20);

  if (Number.isNaN(parsed)) {
    return 20;
  }

  return Math.min(Math.max(parsed, 1), 50);
};

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

const createNotification = async ({
  user_id,
  type,
  title,
  message,
  data = {},
  dedupe_key = null,
}) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        user_id,
        type,
        title,
        message,
        data,
        dedupe_key,
      },
    });

    return {
      created: true,
      notification: formatNotification(notification),
    };
  } catch (error) {
    if (error.code !== "P2002" || !dedupe_key) {
      throw error;
    }

    const existingNotification = await prisma.notification.findUnique({
      where: {
        user_id_dedupe_key: {
          user_id,
          dedupe_key,
        },
      },
    });

    return {
      created: false,
      notification: existingNotification
        ? formatNotification(existingNotification)
        : null,
    };
  }
};

const getNotificationsForUser = async ({ user_id, status = "all", limit = 20 }) => {
  const notifications = await prisma.notification.findMany({
    where: {
      user_id,
      ...(status === "unread" ? { read_at: null } : {}),
    },
    orderBy: {
      created_at: "desc",
    },
    take: clampLimit(limit),
  });

  return notifications.map(formatNotification);
};

const getNotificationById = async (id) => {
  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  return notification ? formatNotification(notification) : null;
};

const countUnreadForUser = async (user_id) => {
  return prisma.notification.count({
    where: {
      user_id,
      read_at: null,
    },
  });
};

const markNotificationRead = async ({ id, user_id }) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id,
      user_id,
    },
  });

  if (!notification) {
    return null;
  }

  if (notification.read_at) {
    return formatNotification(notification);
  }

  const updatedNotification = await prisma.notification.update({
    where: { id },
    data: {
      read_at: new Date(),
    },
  });

  return formatNotification(updatedNotification);
};

const markAllNotificationsRead = async (user_id) => {
  await prisma.notification.updateMany({
    where: {
      user_id,
      read_at: null,
    },
    data: {
      read_at: new Date(),
    },
  });

  return getNotificationsForUser({ user_id });
};

const getAdminUserIds = async () => {
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true },
  });

  return admins.map((admin) => admin.id);
};

export default {
  createNotification,
  getNotificationById,
  getNotificationsForUser,
  countUnreadForUser,
  markNotificationRead,
  markAllNotificationsRead,
  getAdminUserIds,
};
