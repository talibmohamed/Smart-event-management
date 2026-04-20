import Notification from "../models/Notification.js";

const VALID_STATUS_FILTERS = ["all", "unread"];

const getMyNotifications = async (req, res) => {
  try {
    const status = req.query.status || "all";

    if (!VALID_STATUS_FILTERS.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification status filter",
      });
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.getNotificationsForUser({
        user_id: req.user.id,
        status,
        limit: req.query.limit,
      }),
      Notification.countUnreadForUser(req.user.id),
    ]);

    return res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully",
      data: {
        notifications,
        unread_count: unreadCount,
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching notifications",
      error: error.message,
    });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.markNotificationRead({
      id: req.params.id,
      user_id: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const unreadCount = await Notification.countUnreadForUser(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: {
        notification,
        unread_count: unreadCount,
      },
    });
  } catch (error) {
    console.error("Mark notification read error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating notification",
      error: error.message,
    });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const notifications = await Notification.markAllNotificationsRead(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Notifications marked as read",
      data: {
        notifications,
        unread_count: 0,
      },
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating notifications",
      error: error.message,
    });
  }
};

export default {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
