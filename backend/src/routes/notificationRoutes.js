import express from "express";
import notificationController from "../controllers/notificationController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, notificationController.getMyNotifications);
router.patch("/read-all", authMiddleware, notificationController.markAllNotificationsRead);
router.patch("/:id/read", authMiddleware, notificationController.markNotificationRead);

export default router;
