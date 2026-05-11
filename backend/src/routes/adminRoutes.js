import express from "express";
import adminUserController from "../controllers/adminUserController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import requireAdmin from "../middlewares/requireAdmin.js";

const router = express.Router();

router.use(authMiddleware, requireAdmin);

router.get("/users", adminUserController.listUsers);
router.get("/users/:id", adminUserController.getUserById);
router.patch("/users/:id/role", adminUserController.updateUserRole);
router.patch("/users/:id/status", adminUserController.updateUserStatus);

export default router;
