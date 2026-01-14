const Wishlist = require("../models/wishlist");

// exports.addToWishList = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { productId } = req.body;
//     let wishlist = await WishList.findOne({ userId: userId });
//     if (!wishlist) {
//       wishlist = new WishList({
//         userId: userId,
//         items: [{ productId: productId }],
//       });
//     } else {
//       const exists = wishlist.items.find((item) =>
//         item.productId.equals(productId)
//       );
//       if (exists) {
//         res.status(400).json({
//           message: "WishList Already Exist",
//         });
//       } else {
//         wishlist.items.push({ productId: productId });
//       }
//     }
//     await wishlist.save();
//     return res.status(201).json({
//       message: "Product added to wishlist",
//       userId: userId,
//       wishlist,
//     });
//   } catch (err) {
//     res.status(500).json({
//       message: "Error: " + err.message,
//     });
//   }
// };
exports.addToWishList = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user._id;
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({ userId, items: [{ productId }] });
    } else {
      const exists = wishlist.items.find(
        (item) => item.productId.toString() === productId.toString()
      );
      if (exists) {
        return res
          .status(400)
          .json({ success: false, message: "Product already in wishlist." });
      }
      wishlist.items.push({ productId });
    }

    await wishlist.save();
    res
      .status(201)
      .json({ success: true, message: "Product added to wishlist." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error: " + error.message });
  }
};
exports.getWishList = async (req, res) => {
  try {
    const userId = req.user._id;
    const wishlist = await Wishlist.findOne({ userId }).populate(
      "items.productId",
      "name price image unit"
    );

    if (!wishlist) {
      return res
        .status(404)
        .json({ success: false, message: "Wishlist not found." });
    }
    const wishlistResonse = wishlist.items.map((item) => ({
      ...item._doc,
      product: item.productId,
      productId: undefined,
    }));

    res.status(200).json({
      success: true,
      _id: wishlist._id,
      userId: wishlist.userId,
      items: wishlistResonse,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error: " + error.message });
  }
};
// exports.getWishList = async (req, res) => {
//   try {
//     // const { userId } = req.params;
//     const userId = req.user._id;

//     const wishList = await WishList.findOne({ userId: userId }).populate(
//       "items.productId",
//       "id name price image unit"
//     );
//     const formattedWishList = {
//       _id: wishList._id,
//       userId: wishList.userId,
//       items: wishList.items.map((item) => ({
//         product: item.productId,
//         addedAt: item.addedAt,
//       })),
//     };
//     if (!wishList) {
//       return res.status(404).json({
//         message: "WishList Not Found",
//       });
//     }
//     res.status(200).json({
//       message: "WishList retrieved successfully",
//       wishList: formattedWishList,
//     });
//   } catch (err) {
//     res.status(500).json({
//       message: "Error: " + err.message,
//     });
//   }
// };
exports.removeProductFromWishList = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;
    const wishList = await Wishlist.findOne(userId);

    if (!wishList) {
      return res.status(404).json({
        message: "WishList not found",
      });
    }
    const productExists = wishList.items.find((item) =>
      item.productId.equals(productId)
    );
    if (!productExists) {
      return res.status(400).json({
        success: false,
        message: "Product not found in wishlist",
        // wishList,
      });
    }
    const upDatedWishList = await Wishlist.findOneAndUpdate(
      { userId: userId },
      { $pull: { items: { productId: productId } } },
      { new: true }
    );
    // if (!upDatedWishList) {
    //   return res.status(404).json({
    //     message: "WishList not found",
    //   });
    // }
    res.status(200).json({
      success: true,
      message: "Product remove from wishlist",
      wishList: upDatedWishList,
    });
    await upDatedWishList.save();
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error: " + err.message,
    });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;
    const wishlist = await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { items: { productId } } },
      { new: true }
    );

    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found." });
    }

    res
      .status(200)
      .json({ message: "Product removed from wishlist.", wishlist });
  } catch (error) {
    res.status(500).json({ message: "Error: " + error.message });
  }
};

exports.removeAllProductsFromWishList = async (req, res) => {
  try {
    const userId = req.user._id;

    // const { userId } = req.params;
    const wishList = await Wishlist.findOne({ userId: userId });

    if (!wishList) {
      return res.status(404).json({
        success: false,
        message: "WishList not found",
      });
    }

    wishList.items = [];
    await wishList.save();

    res.status(200).json({
      success: true,
      message: "All products removed from wishlist",
      wishList: wishList,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error: " + err.message,
    });
  }
};

exports.clearWishList = async (req, res) => {
  try {
    const { userId } = req.params;
    const wishList = await WishList.findOneAndDelete({ userId: userId });
    if (!wishList) {
      return res.status(404).json({
        success: false,
        message: "WishList not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "WishList cleared",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error: " + err.message,
    });
  }
};

exports.isInWishList = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    const wishList = await Wishlist.findOne(
      {
        userId: userId,
        "items.productId": productId,
      },
      {
        _id: 1,
      }
    );
    const isInWishList = !!wishList;
    res.status(200).json({
      isInWishList,
      // wishList,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error: " + err.message,
    });
  }
};
