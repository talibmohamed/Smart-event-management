import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { createMockNext, createMockReq, createMockRes } from "../../test/setup.js";
import { protect } from "../authMiddleware.js";

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
  },
}));

vi.mock("../../models/User.js", () => ({
  default: {
    findUserById: vi.fn(),
  },
}));

const { default: User } = await import("../../models/User.js");

describe("auth middleware", () => {
  beforeEach(() => {
    jwt.verify.mockReset();
    User.findUserById.mockResolvedValue({
      id: "user-1",
      first_name: "Test",
      last_name: "User",
      email: "test@example.com",
      role: "attendee",
      status: "active",
    });
  });

  it("returns 401 when token is missing", async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Not authorized",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error("invalid");
    });
    const req = createMockReq({
      headers: { authorization: "Bearer bad-token" },
    });
    const res = createMockRes();
    const next = createMockNext();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Token invalid",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("sets req.user and calls next when token is valid", async () => {
    jwt.verify.mockReturnValue({ id: "user-1", role: "attendee" });
    const req = createMockReq({
      headers: { authorization: "Bearer valid-token" },
    });
    const res = createMockRes();
    const next = createMockNext();

    await protect(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith("valid-token", "test-jwt-secret");
    expect(User.findUserById).toHaveBeenCalledWith("user-1");
    expect(req.user).toEqual({
      id: "user-1",
      first_name: "Test",
      last_name: "User",
      email: "test@example.com",
      role: "attendee",
      status: "active",
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 401 when token user no longer exists", async () => {
    jwt.verify.mockReturnValue({ id: "missing-user", role: "attendee" });
    User.findUserById.mockResolvedValue(null);
    const req = createMockReq({
      headers: { authorization: "Bearer valid-token" },
    });
    const res = createMockRes();
    const next = createMockNext();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Not authorized",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when token user is suspended", async () => {
    jwt.verify.mockReturnValue({ id: "user-1", role: "attendee" });
    User.findUserById.mockResolvedValue({
      id: "user-1",
      first_name: "Test",
      last_name: "User",
      email: "test@example.com",
      role: "attendee",
      status: "suspended",
    });
    const req = createMockReq({
      headers: { authorization: "Bearer valid-token" },
    });
    const res = createMockRes();
    const next = createMockNext();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Account suspended",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
