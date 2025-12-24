const express = require("express");
const router = express.Router();
const AuthController = require("../controller/auth.controller");

// ----------------------
// User OTP & Login
// ----------------------
router.post("/send-otp", AuthController.sendOTP); // Send OTP
router.post("/verify-otp", AuthController.verifyOTP); // Verify OTP & login/register

// ----------------------
// Logout
// ----------------------
router.post("/logout", AuthController.logout); // Logout current session

// ----------------------
// Refresh token
// ----------------------
router.post("/refresh", AuthController.refreshToken); // Refresh access token

// ----------------------
// User sessions
// ----------------------
router.get("/sessions", AuthController.getSessions); // List all sessions
router.delete(
  "/sessions/:sessionId",

  AuthController.logoutSession
); // Logout a specific session

// ----------------------
// Profile
// ----------------------
router.get("/profile", AuthController.getProfile);

// ----------------------
// Password reset / change
// ----------------------
router.post("/password/send-reset-otp", AuthController.sendResetOTP); // Send OTP for reset/setup
router.post("/password/reset", AuthController.resetPassword); // Reset password via OTP
router.post("/password/change", AuthController.changePassword); // Change password (authenticated)

// ----------------------
// Admin login
// ----------------------
router.post("/admin/login", AuthController.adminLogin);

// ----------------------
// Auth stats (optional admin/debug)
// ----------------------
router.get("/stats", AuthController.getAuthStats);

module.exports = router;
