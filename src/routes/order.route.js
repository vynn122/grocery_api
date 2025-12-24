const express = require("express");
const { createOrder } = require("../controller/order.controller");
const router = express.Router();

router.post("/orders", createOrder);

module.exports = router;
