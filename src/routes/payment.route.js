const express = require("express");
const {
  createPayment,
  checkPayment,
} = require("../controller/payment.controller");
const router = express.Router();
const { validate_token } = require("../middleware/auth");

router.post("/create_payment", validate_token(), createPayment);
router.post("/check_payment", validate_token(), checkPayment);

module.exports = router;
