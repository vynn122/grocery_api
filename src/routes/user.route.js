const express = require("express");
const userController = require("../controller/user.controller");
const router = express.Router();
const { validate_token } = require("../middleware/auth");
const { userUpload } = require("../config/multer");

router.post("/register", userController.register);
router.post("/login", userController.login);

router.get("/profile", validate_token(), userController.getProfile);
router.post("/send_otp", userController.sendOTP);
router.post("/verify_otp", userController.verifyOTP);
router.post(
  "/user/edit_profile",
  validate_token(),
  userUpload.single("picture"),
  userController.editProfile
);

router.post("/logout", validate_token(), userController.logout);

module.exports = router;
