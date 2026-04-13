import { describe, expect, it } from "vitest";
import { createMockNext, createMockReq, createMockRes } from "../../test/setup.js";
import roleMiddleware from "../roleMiddleware.js";

describe("role middleware", () => {
  it("blocks users without an allowed role", () => {
    const req = createMockReq({
      user: {
        id: "attendee-1",
        role: "attendee",
      },
    });
    const res = createMockRes();
    const next = createMockNext();

    roleMiddleware("organizer", "admin")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Access denied. Insufficient permissions",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("allows users with an allowed role", () => {
    const req = createMockReq({
      user: {
        id: "organizer-1",
        role: "organizer",
      },
    });
    const res = createMockRes();
    const next = createMockNext();

    roleMiddleware("organizer", "admin")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
