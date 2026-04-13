import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sendEmailBestEffort } from "../utils/emailService.js";
import { passwordResetEmail } from "../utils/emailTemplates.js";

const PASSWORD_RESET_TOKEN_EXPIRES_MINUTES = 60;

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const hashPasswordResetToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const buildPasswordResetUrl = (token) => {
  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(
    /\/$/,
    ""
  );

  return `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
};

export const register = async (req, res) => {
  try {
    const { first_name, last_name, email, password, role } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const allowedRoles = ["attendee", "organizer"];
    const userRole = allowedRoles.includes(role) ? role : "attendee";

    const user = await prisma.user.create({
      data: {
        first_name,
        last_name,
        email,
        password_hash: hashedPassword,
        role: userRole,
      },
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        token,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim() },
    });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = hashPasswordResetToken(resetToken);
      const resetExpiresAt = new Date(
        Date.now() + PASSWORD_RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000
      );

      await prisma.$executeRaw`
        UPDATE users
        SET password_reset_token_hash = ${resetTokenHash},
            password_reset_expires_at = ${resetExpiresAt}
        WHERE id = CAST(${user.id} AS uuid)
      `;

      sendEmailBestEffort(
        passwordResetEmail({
          user,
          resetUrl: buildPasswordResetUrl(resetToken),
          expiresInMinutes: PASSWORD_RESET_TOKEN_EXPIRES_MINUTES,
        })
      );
    }

    return res.status(200).json({
      success: true,
      message: "If an account exists for this email, a password reset link has been sent",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error during password reset request",
      error: error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Token and password are required",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const tokenHash = hashPasswordResetToken(String(token));

    const users = await prisma.$queryRaw`
      SELECT id, email, first_name, last_name
      FROM users
      WHERE password_reset_token_hash = ${tokenHash}
        AND password_reset_expires_at > NOW()
      LIMIT 1
    `;
    const user = users[0];

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.$executeRaw`
      UPDATE users
      SET password_hash = ${hashedPassword},
          password_reset_token_hash = NULL,
          password_reset_expires_at = NULL
      WHERE id = CAST(${user.id} AS uuid)
    `;

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error during password reset",
      error: error.message,
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        created_at: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
