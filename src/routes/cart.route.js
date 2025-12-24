const express = require("express");
const cartController = require("../controller/cart.controller");
const { TokenExpiredError } = require("jsonwebtoken");
const router = express.Router();

router.get("/cart", cartController.getCart);
router.post("/cart", cartController.createCart);
router.delete("/cart/:id", cartController.removeCart);
router.delete("/cart", cartController.removeCartItem);

module.exports = router;
