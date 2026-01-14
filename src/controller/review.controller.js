const Review = require("../models/review");
const Order = require("../models/order");
const Product = require("../models/product");
const { default: mongoose } = require("mongoose");

exports.createReview = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, rating, comment, images = [] } = req.body;

    //  Find the latest delivered/completed order containing this product
    const order = await Order.findOne({
      userId,
      "items.productId": new mongoose.Types.ObjectId(productId),
      orderStatus: { $in: ["Delivered", "Completed", "Processing"] }, // only allow reviews for delivered/completed
    }).sort({ createdAt: -1 }); // latest order first

    if (!order) {
      return res.status(400).json({
        success: false,
        message: "You must purchase this product before reviewing",
      });
    }

    //  Check if user already reviewed this product for this order
    const existing = await Review.findOne({
      userId,
      productId,
      orderId: order._id,
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already reviewed this product for this order",
      });
    }

    //  Create review
    const review = await Review.create({
      userId,
      productId,
      orderId: order._id,
      rating,
      comment,
      images,
      isVerifiedPurchase: true,
    });

    //  Update product stats (only include non-hidden reviews)
    const stats = await Review.aggregate([
      {
        $match: {
          productId: new mongoose.Types.ObjectId(productId),
          isHidden: false,
        },
      },
      {
        $group: {
          _id: "$productId",
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    await Product.findByIdAndUpdate(productId, {
      rating: stats[0]?.avgRating || 0,
      reviewCount: stats[0]?.totalReviews || 0,
    });

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
// exports.createReviewZIn = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { productId, rating, comment, images = [] } = req.body;

//     // Check if user already reviewed
//     const existing = await Review.findOne({ userId, productId });
//     if (existing) {
//       return res.status(400).json({
//         success: false,
//         message: "You already reviewed this product",
//       });
//     }

//     //  Verify purchase
//     const order = await Order.findOne({
//       userId,
//       "items.productId": new mongoose.Types.ObjectId(productId), // ✅
//       orderStatus: { $in: ["Delivered", "Completed", "Processing"] },
//     });

//     if (!order) {
//       return res.status(400).json({
//         success: false,
//         message: "You must purchase this product before reviewing",
//       });
//     }

//     //  Create review
//     const review = await Review.create({
//       userId,
//       productId,
//       rating,
//       comment,
//       images,
//       orderId: order._id,
//       isVerifiedPurchase: true,
//     });

//     // Update product stats
//     const stats = await Review.aggregate([
//       {
//         $match: {
//           productId: new mongoose.Types.ObjectId(productId),
//           isHidden: false,
//         },
//       },
//       {
//         $group: {
//           _id: "$productId",
//           avgRating: { $avg: "$rating" },
//           totalReviews: { $sum: 1 },
//         },
//       },
//     ]);

//     await Product.findByIdAndUpdate(productId, {
//       rating: stats[0]?.avgRating || 0,
//       reviewCount: stats[0]?.totalReviews || 0,
//     });

//     res.status(201).json({
//       success: true,
//       message: "Review submitted successfully",
//       review,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({
      productId,
      isHidden: false,
    })
      .populate("userId", "username picture")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.toggleReviewVisibility = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }

    review.isHidden = !review.isHidden;
    await review.save();

    res.json({
      success: true,
      message: review.isHidden ? "Review hidden" : "Review visible",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.deleteReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;

    const review = await Review.findOneAndDelete({
      _id: reviewId,
      userId,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found or not authorized",
      });
    }

    const stats = await Review.aggregate([
      { $match: { productId: review.productId, isHidden: false } },
      {
        $group: {
          _id: "$productId",
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    await Product.findByIdAndUpdate(review.productId, {
      rating: stats[0]?.avgRating || 0,
      reviewCount: stats[0]?.totalReviews || 0,
    });

    res.json({ success: true, message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
