import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { createMockNext, createMockReq, createMockRes } from "../../test/setup.js";
import { protect } from "../authMiddleware.js";

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
  },
}));

describe("auth middleware", () => {
  beforeEach(() => {
    jwt.verify.mockReset();
  });

  it("returns 401 when token is missing", () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Not authorized",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", () => {
    jwt.verify.mockImplementation(() => {
      throw new Error("invalid");
    });
    const req = createMockReq({
      headers: { authorization: "Bearer bad-token" },
    });
    const res = createMockRes();
    const next = createMockNext();

    protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Token invalid",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("sets req.user and calls next when token is valid", () => {
    jwt.verify.mockReturnValue({ id: "user-1", role: "attendee" });
    const req = createMockReq({
      headers: { authorization: "Bearer valid-token" },
    });
    const res = createMockRes();
    const next = createMockNext();

    protect(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith("valid-token", "test-jwt-secret");
    expect(req.user).toEqual({ id: "user-1", role: "attendee" });
    expect(next).toHaveBeenCalledOnce();
  });
});
