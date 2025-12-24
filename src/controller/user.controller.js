const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SMSService = require("../utils/sms");
const OTPService = require("../utils/otp");
const emailService = require("../../services/emailService");
const OTPModel = require("../models/otpModel");

exports.sendOTP = async (req, res) => {
  const { email } = req.body;
  const isUserExist = await User.findOne({ email });
  if (isUserExist) {
    return res.status(400).json({
      message: `User ${isUserExist.email} already register`,
    });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  const expiresAt = Date.now() + 5 * 60 * 1000;

  await OTPModel.findOneAndUpdate(
    { email },
    { otp, expiresAt },
    { upsert: true }
  );

  await emailService.sendEmail(email, otp);

  res.json({ message: "OTP sent to your email" });
};
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  const record = await OTPModel.findOne({ email });

  if (!record) return res.status(400).json({ message: "OTP not found" });
  if (record.expiresAt < Date.now())
    return res.status(400).json({ message: "OTP expired" });
  if (record.otp != otp)
    return res.status(400).json({ message: "Invalid OTP" });
  await User.updateOne({ email }, { isVerified: true });

  res.json({ message: "OTP verified", verified: true });
};
exports.register = async (req, res) => {
  const { email, password } = req.body;
  const isUserExist = await User.findOne({ email });
  if (isUserExist) {
    return res.status(400).json({
      success: false,
      message: `User ${isUserExist.email} already register`,
    });
  }
  const otpRecord = await OTPModel.findOne({ email });
  if (!otpRecord)
    return res.status(400).json({
      success: false,
      message: "Please verify your email before registering",
    });

  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(password, salt);
  // req.body.password = hashPassword;

  // const user = new User(req.body);
  const user = new User({
    ...req.body,
    password: hashPassword,
    role: "user",
    isVerified: true,
  });

  await user.save();
  const { password: _, ...userData } = user.toObject();
  const access_token = jwt.sign(userData, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  await OTPModel.deleteOne({ email });

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    user: userData,
    token: access_token,
  });
};

exports.registerMain = async (req, res) => {
  try {
    const { email, password } = req.body;
    const isUserExist = await User.findOne({ email });
    if (isUserExist) {
      return res.status(400).json({
        message: `User ${isUserExist.email} already register`,
      });
    }
    const salt = await bcrypt.genSalt(10);
    console.log(salt);
    const hashPassword = await bcrypt.hash(password, salt);
    console.log(hashPassword);
    req.body.password = hashPassword;
    const user = new User(req.body);
    await user.save();

    res.status(201).json({
      message: "User register sucessfully",
      user,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error: " + err.message,
    });
  }
};
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid username and password",
      });
    }
    if (user.role === "user" && !user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email before logging in",
      });
    }
    const isMatch = bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid username and password",
      });
    }
    // 4. Generate OTP
    // const otp = OTPService.generateOTP();
    // OTPService.storeOTP(phone, otp);

    // // 5. Send OTP
    // await SMSService.sentOTP(phone, otp);
    const { password: _, ...userData } = user.toObject();
    console.log();
    const accessToken = jwt.sign(userData, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const refreshToken = jwt.sign(userData, process.env.JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });
    res.cookie("token", accessToken, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    // res.cookie("refreshToken", refreshToken, {
    //   httpOnly: true,
    //   sameSite: "strict",
    //   maxAge: 7 * 24 * 60 * 60 * 1000,
    // });
    res.status(200).json({
      success: true,
      message: "Login Sucessful",
      user: userData,
      token: accessToken,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error: " + err.message,
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(userId);

    const user = await User.findOne({ _id: userId }).select("-password");
    //console.log(user);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      user,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error:" + err.message,
    });
  }
};

exports.logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });
    res.status(200).json({
      message: "Logout Successful",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
