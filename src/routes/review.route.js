const express = require("express");
const router = express.Router();
const reviewController = require("../controller/review.controller");
const auth = require("../middleware/auth");

router.post("/review", auth.validate_token(), reviewController.createReview);
router.get("/review/product/:productId", reviewController.getProductReviews);
router.delete(
  "/:reviewId",
  auth.validate_token(),
  reviewController.deleteReview
);
router.patch(
  "/:reviewId/hide",
  auth.validate_token(),
  reviewController.toggleReviewVisibility
);

module.exports = router;
