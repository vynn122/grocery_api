const redis = require("redis");
const logger = require("../utils/logger");
const { envConfig } = require("./envConfig");

let redisClient = null;

/**
 * Initialize Redis client
 */
exports.connectRedis = async () => {
  if (redisClient) return redisClient;

  try {
    logger.info("Initializing Redis...");

    const options = {
      socket: {
        host: envConfig.redis.host,
        port: envConfig.redis.port,
        reconnectStrategy: (retries) => {
          const delay = Math.min(retries * 50, 500);
          logger.warn(
            `Redis reconnecting attempt #${retries}, delay ${delay}ms`
          );
          return delay;
        },
      },
      database: envConfig.redis.database || 0,
    };

    if (envConfig.redis.password) {
      options.password = envConfig.redis.password;
    }

    redisClient = redis.createClient(options);

    // Event listeners
    redisClient.on("connect", () => logger.info("Redis client connected."));
    redisClient.on("ready", () => logger.info("Redis ready."));
    redisClient.on("error", (err) =>
      logger.error(`Redis error: ${err.message}`)
    );
    redisClient.on("end", () => logger.info("Redis disconnected."));
    redisClient.on("reconnecting", () => logger.info("Redis reconnecting..."));

    await redisClient.connect();

    return redisClient;
  } catch (err) {
    logger.error(`Failed to connect to Redis: ${err.message}`);
    process.exit(1);
  }
};

/**
 * Get Redis client instance
 */
exports.getRedisClient = () => {
  if (!redisClient) {
    throw new Error("Redis client not initialized. Call connectRedis() first.");
  }
  return redisClient;
};

/**
 * Graceful shutdown for Redis
 */
const gracefulShutdown = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info("Redis client quit successfully.");
    } catch (err) {
      logger.error("Error quitting Redis:", err.message);
    }
  }
  process.exit(0);
};

// Handle app termination
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
