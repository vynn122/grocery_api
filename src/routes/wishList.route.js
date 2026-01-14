const express = require("express");
const {
  addToWishList,
  removeProductFromWishList,
  getWishList,
  isInWishList,
  removeFromWishlist,
} = require("../controller/wishlist.controller");
const { validate_token } = require("../middleware/auth");
const router = express.Router();

router.get("/wishlist", validate_token(), getWishList);
router.post("/wishlist", validate_token(), addToWishList);
router.post("/wishlist/remove", validate_token(), removeProductFromWishList);
router.delete("/wishlist/:productId", validate_token(), removeFromWishlist);
router.get(
  "/wishlist/is_in_wishlist/:productId",
  validate_token(),
  isInWishList
);

module.exports = router;
