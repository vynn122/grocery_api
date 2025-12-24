// controllers/auth.controller.js
const User = require("../models/user");
const { getRedisClient } = require("../config/redis");
const SMSService = require("../utils/sms");
const logger = require("../utils/logger");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { generateTokenPair, generateAccessToken } = require("../config/auth");

/**
 * Notes:
 * - This controller expects:
 *   - redis client from getRedisClient() following node-redis v4 or v3 names (we normalize).
 *   - SMSService.sendOTP(phone, otp) / sendPasswordResetOTP(phone, otp)
 *   - generateTokenPair(payload) -> { accessToken, refreshToken }
 *   - generateAccessToken(payload)
 */

class AuthController {
  // ---------- Profile ----------
  static async getProfile(req, res) {
    return res.status(200).json({
      success: true,
      message: "Profile endpoint placeholder",
      data: req.user || {},
    });
  }

  // ---------- Change password ----------
  static async changePassword(req, res) {
    return res.status(200).json({
      success: true,
      message: "Change password endpoint placeholder",
    });
  }

  // ---------- Admin login ----------
  static async adminLogin(req, res) {
    return res.status(200).json({
      success: true,
      message: "Admin login endpoint placeholder",
    });
  }

  // ---------- Auth stats ----------
  static async getAuthStats(req, res) {
    return res.status(200).json({
      success: true,
      message: "Auth stats endpoint placeholder",
    });
  }

  // ---------- Helpers ----------
  static normalizePhone(phone) {
    if (!phone) return phone;
    // If already in E.164, keep it. If starts with 0, assume local (Cambodia) +855
    const p = phone.trim();
    if (p.startsWith("+")) return p;
    // replace leading 0 -> +855
    if (p.startsWith("0")) return "+855" + p.replace(/^0+/, "");
    // fallback: prefix plus
    return "+" + p;
  }

  static phoneIsValid(phone) {
    // Loose E.164-ish check: 8-15 digits with optional leading +
    return /^(?:\+?\d{8,15})$/.test(phone);
  }

  static redisHelpers(client) {
    return {
      sAdd: client.sAdd || client.sadd,
      sRem: client.sRem || client.srem,
      sMembers: client.sMembers || client.smembers,
    };
  }

  static async safeRedis(fn, fallback = null) {
    try {
      return await fn();
    } catch (err) {
      logger.warn("Redis unavailable:", err.message);
      return fallback;
    }
  }

  static generateOTP() {
    // crypto.randomInt is inclusive lower, exclusive upper
    return crypto.randomInt(100000, 1000000).toString();
  }

  // ---------- Send OTP (for login/registration) ----------
  static async sendOTP(req, res) {
    try {
      let { phone } = req.body || {};
      if (!phone)
        return res
          .status(400)
          .json({ success: false, message: "Phone number is required" });

      phone = AuthController.normalizePhone(phone);
      if (!AuthController.phoneIsValid(phone)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid phone number",
        });
      }

      const redisClient = getRedisClient();

      // Rate limiting: max 3 per hour
      const rateLimitKey = `otp_rate_limit:${phone}`;
      const otpKey = `otp:${phone}`;

      // Check rate limit and existing OTP atomically as best as possible
      const [currentCount, existingOTP] =
        await AuthController.safeRedis(async () => {
          return Promise.all([
            redisClient.get(rateLimitKey),
            redisClient.get(otpKey),
          ]);
        }, [null, null]);

      if (existingOTP) {
        const ttl = await AuthController.safeRedis(
          () => redisClient.ttl(otpKey),
          -1
        );
        const minutes = ttl > 0 ? Math.ceil(ttl / 60) : 0;
        return res.status(429).json({
          success: false,
          message: `OTP already sent. Please wait ${minutes} minute(s) before requesting again.`,
        });
      }

      if (currentCount !== null && parseInt(currentCount, 10) >= 3) {
        return res.status(429).json({
          success: false,
          message: "Too many OTP requests. Please try again after an hour.",
        });
      }

      // Generate + store OTP
      const otp = AuthController.generateOTP();
      const otpData = {
        otp,
        phone,
        attempts: 0,
        createdAt: Date.now(),
      };

      // Save OTP with 5 minute TTL
      const setOtpResult = await AuthController.safeRedis(
        () => redisClient.setEx(otpKey, 300, JSON.stringify(otpData)),
        null
      );
      if (setOtpResult === null) {
        // Redis down — we can still operate in development mode by logging OTP
        logger.warn(
          "Redis not available to store OTP; continuing in degraded mode."
        );
      }

      // Update rate-limit counter
      if (currentCount !== null) {
        await AuthController.safeRedis(() => redisClient.incr(rateLimitKey));
      } else {
        await AuthController.safeRedis(() =>
          redisClient.setEx(rateLimitKey, 3600, "1")
        );
      }

      // Send SMS (development: SMSService should log)
      const smsResult = await SMSService.sentOTP(phone, otp);
      if (!smsResult || smsResult.success === false) {
        // cleanup: delete OTP if we stored it
        await AuthController.safeRedis(() => getRedisClient().del(otpKey));
        return res.status(500).json({
          success: false,
          message: "Failed to send OTP. Please try again.",
        });
      }

      logger.info(`OTP sent to ${phone}`);
      return res.status(200).json({
        success: true,
        message: "OTP sent successfully",
        data: { phone, expiresIn: "5 minutes" },
      });
    } catch (err) {
      logger.error("sendOTP error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  // ---------- Verify OTP & register/login ----------
  static async verifyOTP(req, res) {
    try {
      let { phone, otp, name } = req.body || {};
      if (!phone || !otp)
        return res.status(400).json({
          success: false,
          message: "Phone number and OTP are required",
        });

      phone = AuthController.normalizePhone(phone);
      if (!AuthController.phoneIsValid(phone)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid phone number",
        });
      }

      const redisClient = getRedisClient();
      const otpKey = `otp:${phone}`;

      // Fetch OTP from redis with safe fallback
      const stored = await AuthController.safeRedis(
        () => redisClient.get(otpKey),
        null
      );
      if (!stored) {
        return res.status(400).json({
          success: false,
          message: "OTP not found or expired. Please request a new OTP.",
        });
      }

      const otpData = JSON.parse(stored);

      // Attempts limit
      if (otpData.attempts >= 3) {
        await AuthController.safeRedis(() => redisClient.del(otpKey));
        return res.status(400).json({
          success: false,
          message: "Too many attempts. Please request a new OTP.",
        });
      }

      if (otpData.otp !== otp) {
        otpData.attempts += 1;

        // preserve TTL on update
        const ttl = await AuthController.safeRedis(
          () => redisClient.ttl(otpKey),
          -1
        );
        if (ttl > 0) {
          await AuthController.safeRedis(() =>
            redisClient.setEx(otpKey, ttl, JSON.stringify(otpData))
          );
        } else {
          // if TTL invalid, just delete to force fresh OTP
          await AuthController.safeRedis(() => redisClient.del(otpKey));
        }

        return res.status(400).json({
          success: false,
          message: `Invalid OTP. ${3 - otpData.attempts} attempts remaining.`,
        });
      }

      // OTP valid; delete from redis
      await AuthController.safeRedis(() => redisClient.del(otpKey));

      // Find or create user
      let user = await User.findOne({ phone });
      let isNewUser = false;

      if (user) {
        if (!user.isActive)
          return res.status(403).json({
            success: false,
            message: "Your account has been deactivated.",
          });

        user.lastLogin = new Date();
        user.isVerified = true;
        await user.save();
        logger.info(`User logged in: ${phone}`);
      } else {
        // Register new user - require name
        if (!name || String(name).trim().length < 2) {
          return res.status(400).json({
            success: false,
            message: "Name is required for registration (minimum 2 characters)",
          });
        }
        user = new User({
          phone,
          name: String(name).trim(),
          //   provider: Providers.PHONE,
          isVerified: true,
          lastLogin: new Date(),
        });
        await user.save();
        isNewUser = true;
        logger.info(`New user registered: ${phone}`);
      }

      // generate tokens
      const tokens = generateTokenPair({
        userId: user._id,
        phone: user.phone,
        role: user.role,
      });

      // store refresh token + session in redis (best-effort)
      const sessionId = crypto.randomUUID();
      await AuthController.safeRedis(async () => {
        const refreshKey = `refresh_token:${user._id}`;
        const refreshData = {
          token: tokens.refreshToken,
          userId: user._id.toString(),
          createdAt: Date.now(),
          userAgent: req.get("User-Agent") || "unknown",
          ip:
            req.ip ||
            req.headers["x-forwarded-for"] ||
            req.connection?.remoteAddress,
        };
        await redisClient.setEx(
          refreshKey,
          7 * 24 * 60 * 60,
          JSON.stringify(refreshData)
        );

        // session
        const sessionKey = `session:${user._id}:${sessionId}`;
        const sessionData = {
          sessionId,
          userId: user._id.toString(),
          phone: user.phone,
          role: user.role,
          loginTime: Date.now(),
          userAgent: req.get("User-Agent") || "unknown",
          ip:
            req.ip ||
            req.headers["x-forwarded-for"] ||
            req.connection?.remoteAddress,
          isActive: true,
        };
        await redisClient.setEx(
          sessionKey,
          24 * 60 * 60,
          JSON.stringify(sessionData)
        );

        // add to user sessions set (normalize methods)
        const { sAdd } = AuthController.redisHelpers(redisClient);
        if (sAdd) {
          await sAdd.call(redisClient, `user_sessions:${user._id}`, sessionId);
          await redisClient.expire(
            `user_sessions:${user._id}`,
            7 * 24 * 60 * 60
          );
        }
      }, null);

      return res.status(200).json({
        success: true,
        message: isNewUser ? "Registration successful" : "Login successful",
        data: {
          user: {
            id: user._id,
            phone: user.phone,
            name: user.name,
            role: user.role,
            isVerified: user.isVerified,
          },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          sessionId,
        },
      });
    } catch (err) {
      logger.error("verifyOTP error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  // ---------- Logout (token blacklist + clear refresh/session) ----------
  static async logout(req, res) {
    try {
      const token = req.header("Authorization")?.replace("Bearer ", "");
      const { sessionId } = req.body || {};

      if (!token)
        return res
          .status(400)
          .json({ success: false, message: "No token provided" });

      const decoded = jwt.decode(token);
      if (!decoded)
        return res
          .status(400)
          .json({ success: false, message: "Invalid token" });

      const userId = decoded.userId;
      const tokenExpMs = (decoded.exp || 0) * 1000;
      const ttlSeconds = Math.max(
        0,
        Math.floor((tokenExpMs - Date.now()) / 1000)
      );

      await AuthController.safeRedis(async () => {
        const redisClient = getRedisClient();

        // blacklist access token
        if (ttlSeconds > 0) {
          await redisClient.setEx(
            `blacklist:${token}`,
            ttlSeconds,
            "blacklisted"
          );
        }

        // remove refresh token
        await redisClient.del(`refresh_token:${userId}`);

        if (sessionId) {
          await redisClient.del(`session:${userId}:${sessionId}`);
          const { sRem } = AuthController.redisHelpers(redisClient);
          if (sRem)
            await sRem.call(redisClient, `user_sessions:${userId}`, sessionId);
        } else {
          // delete all sessions
          const { sMembers } = AuthController.redisHelpers(redisClient);
          let ids = [];
          if (sMembers)
            ids =
              (await sMembers.call(redisClient, `user_sessions:${userId}`)) ||
              [];
          const keys = ids.map((id) => `session:${userId}:${id}`);
          if (keys.length) await redisClient.del(keys);
          await redisClient.del(`user_sessions:${userId}`);
        }
      }, null);

      return res
        .status(200)
        .json({ success: true, message: "Logged out successfully" });
    } catch (err) {
      logger.error("logout error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  // ---------- Refresh access token ----------
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body || {};
      if (!refreshToken)
        return res
          .status(400)
          .json({ success: false, message: "Refresh token is required" });

      let decoded;
      try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      } catch (err) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid refresh token" });
      }

      // verify refresh token in redis (best-effort)
      const redisClient = getRedisClient();
      const refreshKey = `refresh_token:${decoded.userId}`;

      const storedTokenData = await AuthController.safeRedis(
        () => redisClient.get(refreshKey),
        null
      );

      if (storedTokenData === null) {
        // Redis unavailable — allow fallback if JWT verify passed
        logger.warn(
          "Redis unavailable while validating refresh token, proceeding using JWT verification only."
        );
      } else {
        const tokenData = JSON.parse(storedTokenData);
        if (tokenData.token !== refreshToken) {
          return res
            .status(401)
            .json({ success: false, message: "Invalid refresh token" });
        }
      }

      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive)
        return res
          .status(401)
          .json({ success: false, message: "User not found or inactive" });

      const newAccessToken = generateAccessToken({
        userId: user._id,
        phone: user.phone,
        role: user.role,
      });

      return res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          accessToken: newAccessToken,
          user: {
            id: user._id,
            phone: user.phone,
            name: user.name,
            role: user.role,
          },
        },
      });
    } catch (err) {
      logger.error("refreshToken error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  // ---------- Get sessions ----------
  static async getSessions(req, res) {
    try {
      const userId = req.user.userId;
      const sessions = [];

      await AuthController.safeRedis(async () => {
        const redisClient = getRedisClient();
        const { sMembers } = AuthController.redisHelpers(redisClient);
        const ids = sMembers
          ? await sMembers.call(redisClient, `user_sessions:${userId}`)
          : [];
        for (const id of ids || []) {
          const s = await redisClient.get(`session:${userId}:${id}`);
          if (s) {
            const sess = JSON.parse(s);
            sessions.push({
              ...sess,
              ttl: await redisClient.ttl(`session:${userId}:${id}`),
            });
          }
        }
      }, null);

      return res.status(200).json({
        success: true,
        data: { sessions, totalSessions: sessions.length },
      });
    } catch (err) {
      logger.error("getSessions error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  // ---------- Logout specific session ----------
  static async logoutSession(req, res) {
    try {
      const userId = req.user.userId;
      const { sessionId } = req.params;
      if (!sessionId)
        return res
          .status(400)
          .json({ success: false, message: "Session ID is required" });

      let found = false;
      await AuthController.safeRedis(async () => {
        const redisClient = getRedisClient();
        const userDeleted = await redisClient.del(
          `session:${userId}:${sessionId}`
        );
        if (userDeleted) {
          found = true;
          const { sRem } = AuthController.redisHelpers(redisClient);
          if (sRem)
            await sRem.call(redisClient, `user_sessions:${userId}`, sessionId);
        }
      }, null);

      if (found)
        return res
          .status(200)
          .json({ success: true, message: "Session logged out successfully" });
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    } catch (err) {
      logger.error("logoutSession error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  // ---------- Send password reset OTP ----------
  static async sendResetOTP(req, res) {
    try {
      let { phone } = req.body || {};
      if (!phone)
        return res
          .status(400)
          .json({ success: false, message: "Phone number is required" });

      phone = AuthController.normalizePhone(phone);
      if (!AuthController.phoneIsValid(phone))
        return res.status(400).json({
          success: false,
          message: "Please enter a valid phone number",
        });

      const user = await User.findOne({ phone });
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      const redisClient = getRedisClient();
      const rateLimitKey = `reset_otp_rate_limit:${phone}`;
      const otpKey = `reset_otp:${phone}`;

      const [currentCount, existingOTP] = await AuthController.safeRedis(
        () =>
          Promise.all([redisClient.get(rateLimitKey), redisClient.get(otpKey)]),
        [null, null]
      );

      if (existingOTP) {
        const ttl = await AuthController.safeRedis(
          () => redisClient.ttl(otpKey),
          -1
        );
        return res.status(429).json({
          success: false,
          message: `Password reset OTP already sent. Please wait ${Math.ceil(
            ttl / 60
          )} minutes.`,
        });
      }

      if (currentCount !== null && parseInt(currentCount, 10) >= 3) {
        return res.status(429).json({
          success: false,
          message: "Too many password reset requests. Try again after an hour.",
        });
      }

      const otp = AuthController.generateOTP();
      const otpData = {
        otp,
        phone,
        attempts: 0,
        createdAt: Date.now(),
        type: "password_reset",
      };
      await AuthController.safeRedis(() =>
        redisClient.setEx(otpKey, 300, JSON.stringify(otpData))
      );
      if (currentCount !== null)
        await AuthController.safeRedis(() => redisClient.incr(rateLimitKey));
      else
        await AuthController.safeRedis(() =>
          redisClient.setEx(rateLimitKey, 3600, "1")
        );

      const smsResult = await SMSService.sendPasswordResetOTP(phone, otp);
      if (!smsResult || smsResult.success === false) {
        await AuthController.safeRedis(() => redisClient.del(otpKey));
        return res.status(500).json({
          success: false,
          message: "Failed to send password reset OTP.",
        });
      }

      logger.info(`Password reset OTP sent to ${phone}`);
      return res.status(200).json({
        success: true,
        message: "Password reset OTP sent successfully",
        data: { phone, expiresIn: "5 minutes" },
      });
    } catch (err) {
      logger.error("sendResetOTP error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  // ---------- Reset password using OTP ----------
  static async resetPassword(req, res) {
    try {
      let { phone, otp, newPassword } = req.body || {};
      if (!phone || !otp || !newPassword)
        return res.status(400).json({
          success: false,
          message: "Phone, OTP and new password are required",
        });

      phone = AuthController.normalizePhone(phone);
      if (!AuthController.phoneIsValid(phone))
        return res.status(400).json({
          success: false,
          message: "Please enter a valid phone number",
        });

      const redisClient = getRedisClient();
      const otpKey = `reset_otp:${phone}`;
      const stored = await AuthController.safeRedis(
        () => redisClient.get(otpKey),
        null
      );
      if (!stored)
        return res.status(400).json({
          success: false,
          message: "OTP not found or expired. Please request a new OTP.",
        });

      const otpData = JSON.parse(stored);
      if (otpData.attempts >= 3) {
        await AuthController.safeRedis(() => redisClient.del(otpKey));
        return res.status(400).json({
          success: false,
          message: "Too many attempts. Request a new password reset OTP.",
        });
      }

      if (otpData.otp !== otp) {
        otpData.attempts += 1;
        const ttl = await AuthController.safeRedis(
          () => redisClient.ttl(otpKey),
          -1
        );
        if (ttl > 0)
          await AuthController.safeRedis(() =>
            redisClient.setEx(otpKey, ttl, JSON.stringify(otpData))
          );
        else await AuthController.safeRedis(() => redisClient.del(otpKey));
        return res.status(400).json({
          success: false,
          message: `Invalid OTP. ${3 - otpData.attempts} attempts remaining.`,
        });
      }

      // OTP valid
      await AuthController.safeRedis(() => redisClient.del(otpKey));

      const user = await User.findOne({ phone }).select("+password");
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      // ensure new password is different (if exists)
      if (user.password) {
        const isSame = await user.comparePassword(newPassword);
        if (isSame)
          return res.status(400).json({
            success: false,
            message: "New password must be different from current password",
          });
      }

      user.password = newPassword;
      user.passwordChangedAt = new Date();
      await user.save();

      // Invalidate sessions & refresh tokens
      await AuthController.safeRedis(async () => {
        const refreshKey = `refresh_token:${user._id}`;
        await getRedisClient().del(refreshKey);

        const userSessionsKey = `user_sessions:${user._id}`;
        const { sMembers } = AuthController.redisHelpers(getRedisClient());
        const ids = sMembers
          ? await sMembers.call(getRedisClient(), userSessionsKey)
          : [];
        const keys = ids.map((id) => `session:${user._id}:${id}`);
        if (keys.length) await getRedisClient().del(keys);
        await getRedisClient().del(userSessionsKey);
      }, null);

      logger.info(`Password reset for user: ${phone}`);
      return res.status(200).json({
        success: true,
        message:
          "Password reset successfully. Please login with your new password.",
      });
    } catch (err) {
      logger.error("resetPassword error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
}

module.exports = AuthController;
