import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import { createRedisConnection, isRedisEnabled } from "../config/redis.js";

const TRUE_VALUES = new Set(["true", "1", "yes"]);

const isAuthRateLimitEnabled = () =>
  TRUE_VALUES.has(String(process.env.AUTH_RATE_LIMIT_ENABLED || "false").toLowerCase());

const tooManyAttemptsResponse = (res) =>
  res.status(429).json({
    success: false,
    message: "Too many attempts. Please try again later.",
  });

const getIp = (req) =>
  req.ip || req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown-ip";

const normalizeEmail = (email) =>
  String(email || "unknown-email").trim().toLowerCase();

export const buildRateLimitKey = (req, strategy) => {
  const ip = getIp(req);

  if (strategy === "email_ip") {
    return `${normalizeEmail(req.body?.email)}:${ip}`;
  }

  return ip;
};

export const createRateLimiter = ({ points, duration, keyPrefix }) => {
  if (isRedisEnabled()) {
    return new RateLimiterRedis({
      storeClient: createRedisConnection(),
      keyPrefix,
      points,
      duration,
    });
  }

  return new RateLimiterMemory({
    keyPrefix,
    points,
    duration,
  });
};

export const makeRateLimitMiddleware = ({
  points,
  duration,
  keyPrefix,
  strategy = "ip",
  limiter = null,
}) => {
  let activeLimiter = limiter;

  return async (req, res, next) => {
    if (!isAuthRateLimitEnabled()) {
      return next();
    }

    try {
      if (!activeLimiter) {
        activeLimiter = createRateLimiter({ points, duration, keyPrefix });
      }

      await activeLimiter.consume(buildRateLimitKey(req, strategy));
      return next();
    } catch {
      return tooManyAttemptsResponse(res);
    }
  };
};

export const makeFailedAttemptRateLimitMiddleware = ({
  points,
  duration,
  keyPrefix,
  strategy = "email_ip",
  limiter = null,
}) => {
  let activeLimiter = limiter;

  return async (req, res, next) => {
    if (!isAuthRateLimitEnabled()) {
      return next();
    }

    try {
      if (!activeLimiter) {
        activeLimiter = createRateLimiter({ points, duration, keyPrefix });
      }

      const key = buildRateLimitKey(req, strategy);
      const current = await activeLimiter.get(key);

      if (current && current.consumedPoints >= points) {
        return tooManyAttemptsResponse(res);
      }

      let responseStatus = 200;
      const originalStatus = res.status.bind(res);
      const originalJson = res.json.bind(res);

      res.status = (statusCode) => {
        responseStatus = statusCode;
        return originalStatus(statusCode);
      };

      res.json = (payload) => {
        if (responseStatus >= 400) {
          activeLimiter.consume(key).catch((error) => {
            console.error("Rate limit consume error:", error);
          });
        }

        return originalJson(payload);
      };

      return next();
    } catch {
      return tooManyAttemptsResponse(res);
    }
  };
};

export const loginRateLimit = makeFailedAttemptRateLimitMiddleware({
  points: 5,
  duration: 15 * 60,
  keyPrefix: "auth-login",
  strategy: "email_ip",
});

export const registerRateLimit = makeRateLimitMiddleware({
  points: 10,
  duration: 60 * 60,
  keyPrefix: "auth-register",
});

export const forgotPasswordRateLimit = makeRateLimitMiddleware({
  points: 3,
  duration: 60 * 60,
  keyPrefix: "auth-forgot-password",
  strategy: "email_ip",
});

export const resetPasswordRateLimit = makeRateLimitMiddleware({
  points: 10,
  duration: 60 * 60,
  keyPrefix: "auth-reset-password",
});

export default {
  buildRateLimitKey,
  createRateLimiter,
  makeFailedAttemptRateLimitMiddleware,
  makeRateLimitMiddleware,
  loginRateLimit,
  registerRateLimit,
  forgotPasswordRateLimit,
  resetPasswordRateLimit,
};
