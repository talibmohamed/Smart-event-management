import { describe, expect, it } from "vitest";
import { assertRedisConfig, isRedisEnabled } from "../redis.js";

describe("redis config", () => {
  it("does not require REDIS_URL when Redis is disabled", () => {
    process.env.REDIS_ENABLED = "false";
    delete process.env.REDIS_URL;

    expect(isRedisEnabled()).toBe(false);
    expect(() => assertRedisConfig()).not.toThrow();
  });

  it("fails clearly when Redis is enabled without REDIS_URL", () => {
    process.env.REDIS_ENABLED = "true";
    delete process.env.REDIS_URL;

    expect(isRedisEnabled()).toBe(true);
    expect(() => assertRedisConfig()).toThrow("REDIS_URL is required when REDIS_ENABLED=true");
  });
});
