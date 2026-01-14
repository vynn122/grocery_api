const express = require("express");
const cartController = require("../controller/cart.controller");
const { TokenExpiredError } = require("jsonwebtoken");
const { validate_token } = require("../middleware/auth");
const router = express.Router();

router.get("/cart", validate_token(), cartController.getCart);
router.post("/cart", validate_token(), cartController.createCart);
router.patch(
  "/cart/items/:productId",
  validate_token(),
  cartController.updateCartItemQuantity
);
router.delete("/cart/:id", validate_token(), cartController.removeCart);
router.delete(
  "/cart/items/:productId",
  validate_token(),
  cartController.removeCartItem
);

module.exports = router;
