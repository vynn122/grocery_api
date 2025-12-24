const express = require("express");
const authController = require("../controller/auth.controller");

const router = express.Router();

router.post("/google_signin", authController.googleSignIn);

module.exports = router;
