const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const jwt_secret = process.env.JWT_SECRET;

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, jwt_secret, { expiresIn: "7d" });
};

exports.googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;

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

    res
      .status(201)
      .json({ token: token, message: "Google signed in successfully." });
  } catch (err) {
    console.error(err);
    return res.status(401).json({
      message: err.message,
    });
  }
};
