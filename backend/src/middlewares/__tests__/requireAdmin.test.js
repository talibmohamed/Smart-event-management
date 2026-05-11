import { describe, expect, it } from "vitest";
import { createMockNext, createMockReq, createMockRes, mockUser } from "../../test/setup.js";
import requireAdmin from "../requireAdmin.js";

describe("requireAdmin middleware", () => {
  it("returns 403 when user is missing", () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when user is not admin", () => {
    const req = createMockReq({ user: mockUser({ role: "organizer" }) });
    const res = createMockRes();
    const next = createMockNext();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Access denied. Admins only",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when user is admin", () => {
    const req = createMockReq({ user: mockUser({ role: "admin" }) });
    const res = createMockRes();
    const next = createMockNext();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
