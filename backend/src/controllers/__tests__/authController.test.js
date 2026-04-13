import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import {
  createMockReq,
  createMockRes,
  mockUser,
} from "../../test/setup.js";

vi.mock("../../config/prisma.js", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
  },
}));

vi.mock("../../utils/emailService.js", () => ({
  sendEmailBestEffort: vi.fn(),
}));

const { default: prisma } = await import("../../config/prisma.js");
const { sendEmailBestEffort } = await import("../../utils/emailService.js");
const authController = await import("../authController.js");

describe("auth controller password reset", () => {
  beforeEach(() => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.$executeRaw.mockResolvedValue(1);
    prisma.$queryRaw.mockResolvedValue([]);
    bcrypt.hash.mockResolvedValue("hashed-password");
  });

  it("forgot password returns 400 when email is missing", async () => {
    const req = createMockReq({ body: {} });
    const res = createMockRes();

    await authController.forgotPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Email is required",
    });
  });

  it("forgot password stores token and sends email when user exists", async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser());
    const req = createMockReq({ body: { email: "test@example.com" } });
    const res = createMockRes();

    await authController.forgotPassword(req, res);

    expect(prisma.$executeRaw).toHaveBeenCalledOnce();
    expect(sendEmailBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: "Reset your Smart Event Management password",
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("forgot password returns neutral success when user does not exist", async () => {
    const req = createMockReq({ body: { email: "missing@example.com" } });
    const res = createMockRes();

    await authController.forgotPassword(req, res);

    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(sendEmailBestEffort).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "If an account exists for this email, a password reset link has been sent",
    });
  });

  it("reset password rejects missing token or password", async () => {
    const req = createMockReq({ body: { token: "token" } });
    const res = createMockRes();

    await authController.resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Token and password are required",
    });
  });

  it("reset password rejects short password", async () => {
    const req = createMockReq({
      body: { token: "token", password: "123" },
    });
    const res = createMockRes();

    await authController.resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Password must be at least 6 characters",
    });
  });

  it("reset password rejects invalid or expired token", async () => {
    const req = createMockReq({
      body: { token: "token", password: "new-password" },
    });
    const res = createMockRes();

    await authController.resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid or expired password reset token",
    });
  });

  it("reset password updates password and clears reset token", async () => {
    prisma.$queryRaw.mockResolvedValue([{ id: "user-1" }]);
    const req = createMockReq({
      body: { token: "token", password: "new-password" },
    });
    const res = createMockRes();

    await authController.resetPassword(req, res);

    expect(bcrypt.hash).toHaveBeenCalledWith("new-password", 10);
    expect(prisma.$executeRaw).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Password reset successfully",
    });
  });
});
