import express from "express";
import adminAnalyticsController from "../controllers/adminAnalyticsController.js";
import adminTransactionController from "../controllers/adminTransactionController.js";
import adminUserController from "../controllers/adminUserController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import requireAdmin from "../middlewares/requireAdmin.js";

const router = express.Router();

router.use(authMiddleware, requireAdmin);

router.get("/analytics/summary", adminAnalyticsController.getSummary);
router.get("/analytics/timeseries", adminAnalyticsController.getTimeseries);
router.get("/analytics/top-events", adminAnalyticsController.getTopEvents);
router.get("/analytics/top-organizers", adminAnalyticsController.getTopOrganizers);
router.get("/transactions", adminTransactionController.listTransactions);
router.get("/transactions/:id", adminTransactionController.getTransactionById);
router.get("/users", adminUserController.listUsers);
router.get("/users/:id", adminUserController.getUserById);
router.patch("/users/:id/role", adminUserController.updateUserRole);
router.patch("/users/:id/status", adminUserController.updateUserStatus);

export default router;
