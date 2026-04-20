import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockNext, createMockReq, createMockRes } from "../../test/setup.js";
import {
  buildRateLimitKey,
  makeFailedAttemptRateLimitMiddleware,
  makeRateLimitMiddleware,
} from "../rateLimitMiddleware.js";

describe("rate limit middleware", () => {
  beforeEach(() => {
    process.env.AUTH_RATE_LIMIT_ENABLED = "true";
  });

  it("builds email and IP based keys for login-style limits", () => {
    const req = createMockReq({
      body: { email: " Test@Example.COM " },
      headers: {},
    });
    req.ip = "127.0.0.1";

    expect(buildRateLimitKey(req, "email_ip")).toBe("test@example.com:127.0.0.1");
  });

  it("passes through when the limiter allows the request", async () => {
    const limiter = {
      consume: vi.fn().mockResolvedValue({}),
    };
    const middleware = makeRateLimitMiddleware({
      points: 1,
      duration: 60,
      keyPrefix: "test",
      limiter,
    });
    const req = createMockReq();
    req.ip = "127.0.0.1";
    const res = createMockRes();
    const next = createMockNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 429 when the limiter rejects the request", async () => {
    const limiter = {
      consume: vi.fn().mockRejectedValue(new Error("rate limit exceeded")),
    };
    const middleware = makeRateLimitMiddleware({
      points: 1,
      duration: 60,
      keyPrefix: "test",
      limiter,
    });
    const req = createMockReq();
    req.ip = "127.0.0.1";
    const res = createMockRes();
    const next = createMockNext();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Too many attempts. Please try again later.",
    });
  });

  it("does not consume login limits for successful responses", async () => {
    const limiter = {
      get: vi.fn().mockResolvedValue(null),
      consume: vi.fn().mockResolvedValue({}),
    };
    const middleware = makeFailedAttemptRateLimitMiddleware({
      points: 5,
      duration: 900,
      keyPrefix: "login",
      limiter,
    });
    const req = createMockReq({ body: { email: "test@example.com" } });
    req.ip = "127.0.0.1";
    const res = createMockRes();
    const next = createMockNext();

    await middleware(req, res, next);
    res.status(200).json({ success: true });

    expect(limiter.consume).not.toHaveBeenCalled();
  });

  it("consumes login limits for failed responses", async () => {
    const limiter = {
      get: vi.fn().mockResolvedValue(null),
      consume: vi.fn().mockResolvedValue({}),
    };
    const middleware = makeFailedAttemptRateLimitMiddleware({
      points: 5,
      duration: 900,
      keyPrefix: "login",
      limiter,
    });
    const req = createMockReq({ body: { email: "test@example.com" } });
    req.ip = "127.0.0.1";
    const res = createMockRes();
    const next = createMockNext();

    await middleware(req, res, next);
    res.status(400).json({ success: false });

    expect(limiter.consume).toHaveBeenCalledWith("test@example.com:127.0.0.1");
  });
});
