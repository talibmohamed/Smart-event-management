import express from "express";
import prisma from "../config/prisma.js";

const router = express.Router();

router.get("/db", async (req, res) => {
  try {
    await prisma.$connect();

    const userCount = await prisma.user.count();

    res.status(200).json({
      success: true,
      message: "Database connection successful",
      data: {
        connected: true,
        user_count: userCount,
      },
    });
  } catch (error) {
    console.error("Database test error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

export default router;
