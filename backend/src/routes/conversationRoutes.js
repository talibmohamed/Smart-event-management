import express from "express";
import conversationController from "../controllers/conversationController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", conversationController.listConversations);
router.post("/", conversationController.openConversation);
router.get("/:id", conversationController.getConversation);
router.post("/:id/messages", conversationController.sendMessage);
router.patch("/:id/read", conversationController.markConversationRead);

export default router;
