const express = require("express");
const {
  createOrder,
  getPaidOrdersForUser,
  getAllPurchasedItems,
} = require("../controller/order.controller");
const router = express.Router();
const { validate_token } = require("../middleware/auth");

router.post("/orders", validate_token(), createOrder);
router.get("/user/order_history", validate_token(), getPaidOrdersForUser);

module.exports = router;
