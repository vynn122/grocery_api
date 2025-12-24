const express = require("express");
const {
  createShippingAddress,
} = require("../controller/shippingAddress.controller");
const router = express.Router();
router.post("/address", createShippingAddress);
module.exports = router;
