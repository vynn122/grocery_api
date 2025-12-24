const twilio = require("twilio");
const logger = require("./logger");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

class SMSService {
  static async sentOTP(phone, otp) {
    try {
      // for development mode
      if (process.env.NODE_ENV === "development") {
        logger.info(`OTP for ${phone}: ${otp}`);
      }
      // sent using twilio
      if (
        process.env.NODE_ENV === "production" ||
        process.env.SEND_REAL_SMS === "true"
      ) {
        const verification = await client.verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID)
          .verifications.create({ to: phone, channel: "sms" });
        logger.info(`Verication sent successfully. SID: ${verification.sid}`);
        return {
          success: true,
          message: "OTP sent successfully",
          sid: verification?.sid,
        };
      }

      return {
        success: true,
        message: "OTP sent successfully",
        sid: null,
      };
    } catch (err) {
      logger.error("SMS sending failed: ", err);
      return { success: false, message: "Failed to sent OTP" };
    }
  }

  // Verify OTP using Twilio verify
  static async verifyOTP(phone, code) {
    try {
      if (process.env.NODE_ENV === "development") {
        return { success: true, status: "approved" };
      }
      const verification_check = await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({ to: phone, code: code });
      logger.info(`Verification check status: ${verification_check.status}`);
      return {
        success: verification_check.status === "approved",
        status: verification_check.status,
        message:
          verification_check.status === "approved"
            ? "OTP verified successfully"
            : "Invalid OTP",
      };
    } catch (err) {
      logger.error("OTP verification failed: ", err);
      return { success: false, message: "Failed to verify OTP" };
      //   console.log(err);
    }
  }
  static async sendPasswordResetOTP(phone, otp) {
    try {
      // For development - log OTP
      if (process.env.NODE_ENV === "development") {
        logger.info(`Password Reset OTP for ${phone}: ${otp}`);
        console.log(`\nPassword Reset OTP for ${phone}: ${otp}\n`);
      }

      // Send using Twilio SMS (custom message for password reset)
      if (
        process.env.NODE_ENV === "production" ||
        process.env.SEND_REAL_SMS === "true"
      ) {
        const message = await client.messages.create({
          body: `Your password reset code is: ${otp}. This code will expire in 5 minutes. Do not share this code with anyone.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone,
        });

        logger.info(
          `Password reset SMS sent successfully. SID: ${message.sid}`
        );
        return {
          success: true,
          message: "Password reset OTP sent successfully",
          sid: message.sid,
        };
      }

      return {
        success: true,
        message: "Password reset OTP sent successfully (development mode)",
      };
    } catch (error) {
      logger.error("Password reset SMS sending failed:", error);
      return { success: false, message: "Failed to send password reset OTP" };
    }
  }
}
module.exports = SMSService;
