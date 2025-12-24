const express = require("express");

const router = express.Router();
const {
  addToWishList,
  removeProductFromWishList,
  getWishList,
} = require("../controller/wishlist.controller");

router.get("/wishlist/:userId", getWishList);
router.post("/wishlist", addToWishList);
router.post("/wishlist/remove", removeProductFromWishList);
router.delete("/wishlist/:userId/:productId", removeProductFromWishList);

module.exports = router;
