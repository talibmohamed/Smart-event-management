import express from "express";
import paymentController from "../controllers/paymentController.js";

const router = express.Router();

router.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleStripeWebhook
);

export default router;

