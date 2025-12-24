const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";
const REDIS_DB = process.env.REDIS_DB || 0;
const envConfig = {
  //   port: PORT,
  //   env: NODE_ENV,
  //   cors: {
  //     origin: [
  //       "http://localhost:3000",
  //       "http://localhost:8081",
  //       "http://127.0.0.1:3000",
  //       "http://127.0.0.1:8081",
  //       CORS_ORIGIN,
  //     ],
  //     credentials: true,
  //     methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  //     allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  //   },
  //   jwt: {
  //     secret: JWT_SECRET,
  //     expiresIn: JWT_EXPIRES_IN,
  //     refreshSecret: JWT_REFRESH_SECRET,
  //     refreshExpiresIn: JWT_REFRESH_EXPIRES_IN,
  //   },
  //   mongo: {
  //     uri: process.env.MONGODB_URI,
  //     database: process.env.MONGODB_DATABASE || "movie_booking_system",
  //   },
  redis: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    database: REDIS_DB,
  },
};
module.exports = {
  //   PORT,
  //   MONGODB_URI,
  //   NODE_ENV,
  //   JWT_SECRET,
  //   JWT_EXPIRES_IN,
  //   JWT_REFRESH_SECRET,
  //   JWT_REFRESH_EXPIRES_IN,
  //   CORS_ORIGIN,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  REDIS_DB,
  envConfig,
};
