const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const jwt_secret = process.env.JWT_SECRET;

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (userId) => {
  return jwt.sign({ _id: userId }, jwt_secret, { expiresIn: "7d" });
};

exports.googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (idToken == null || idToken == undefined) {
      return res.status(400).json({
        success: false,
        message: "No ID token bro",
      });
    }

    const tokenInfo = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub, email, name, picture } = tokenInfo.getPayload();
    const googleId = sub;
    let user = await User.findOne({ googleId });
    if (!user) {
      user = new User({
        googleId: googleId,
        email,
        username: name,
        picture,
      });
      await user.save();
    }
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "Google signed in successfully.",
      user: user,
      token: token,
    });
  } catch (err) {
    console.error(err);
    return res.status(401).json({
      success: false,
      message: err.message,
    });
  }
};
