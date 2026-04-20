import IORedis from "ioredis";

const TRUE_VALUES = new Set(["true", "1", "yes"]);

export const isRedisEnabled = () =>
  TRUE_VALUES.has(String(process.env.REDIS_ENABLED || "false").toLowerCase());

export const assertRedisConfig = () => {
  if (isRedisEnabled() && !process.env.REDIS_URL) {
    throw new Error("REDIS_URL is required when REDIS_ENABLED=true");
  }
};

export const createRedisConnection = (options = {}) => {
  assertRedisConfig();

  if (!isRedisEnabled()) {
    return null;
  }

  return new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...options,
  });
};

export const createSocketRedisClients = () => {
  assertRedisConfig();

  if (!isRedisEnabled()) {
    return {
      pubClient: null,
      subClient: null,
    };
  }

  const pubClient = new IORedis(process.env.REDIS_URL);
  const subClient = pubClient.duplicate();

  return {
    pubClient,
    subClient,
  };
};

export default {
  isRedisEnabled,
  assertRedisConfig,
  createRedisConnection,
  createSocketRedisClients,
};
