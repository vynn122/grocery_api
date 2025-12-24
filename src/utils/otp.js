const crypto = require("crypto");
const logger = require("./logger");

const otpStore = new Map();

class OTPService {
  static normalizePhone(phone) {
    if (!phone.startsWith("+")) {
      return "+855" + phone.replace(/^0/, "");
    }
    return phone;
  }
  // generated 6 digits otp
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /// Store OTP with expiration 5mn
  static storeOTP(phone, otp) {
    const phonee = OTPService.normalizePhone(phone);
    const expireAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(phonee, {
      otp,
      expireAt,
      attemps: 0,
    });
    logger.info(`OTP stored for phone: ${phonee}`);

    /// auto cleanup expiration
    setTimeout(() => {
      otpStore.delete(phonee);
    }, 5 * 60 * 1000);
  }
  static verifyOTP(phone, inputOTP) {
    const otpData = otpStore.get(phone);
    if (!otpData) {
      return { success: false, message: "OTP not found or expired" };
    }
    if (Date.now() > otpData.expireAt) {
      otpStore.delete(phone);
      return { success: false, message: "OTP expired" };
    }
    // Increment attemps
    otpData.attemps += 1;

    // Max 3 attemps
    if (otpData.attemps > 3) {
      otpStore.delete(phone);
      return {
        success: false,
        message: "Too many attemps. Please request new OTP",
      };
    }
    if (otpData.otp === inputOTP) {
      otpStore.delete(phone);
      logger.info(`OTP verified successfully for phone ${phone}`);
      return { success: true, message: "OTP verified successfully" };
    }
    return { success: false, message: "Invalid OTP" };
  }

  // check if OTP exists and not expired
  static hasValidOTP(phone) {
    const otpData = otpStore.get(phone);
    return otpData && Date.now() <= otpData.expireAt;
  }

  // clear OTP
  static clearOTP(phone) {
    otpStore.delete(phone);
  }
}

module.exports = OTPService;
