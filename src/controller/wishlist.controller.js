const WishList = require("../models/wishlist");

exports.addToWishList = async (req, res) => {
  try {
    const { userId, productId } = req.body;
    let wishlist = await WishList.findOne({ userId: userId });
    if (!wishlist) {
      wishlist = new WishList({
        userId: userId,
        items: [{ productId: productId }],
      });
    } else {
      const exists = wishlist.items.find((item) =>
        item.productId.equals(productId)
      );
      if (exists) {
        res.status(400).json({
          message: "WishList Already Exist",
        });
      } else {
        wishlist.items.push({ productId: productId });
      }
    }
    await wishlist.save();
    return res.status(201).json({
      message: "Product added to wishlist",
      wishlist,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error: " + err.message,
    });
  }
};
exports.getWishList = async (req, res) => {
  try {
    const { userId } = req.params;
    const wishList = await WishList.findOne({ userId: userId }).populate(
      "items.productId",
      "id name price image unit"
    );
    const formattedWishList = {
      _id: wishList._id,
      userId: wishList.userId,
      items: wishList.items.map((item) => ({
        product: item.productId,
        addedAt: item.addedAt,
      })),
    };
    if (!wishList) {
      return res.status(404).json({
        message: "WishList Not Found",
      });
    }
    res.status(200).json({
      message: "WishList retrieved successfully",
      wishList: formattedWishList,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error: " + err.message,
    });
  }
};
exports.removeProductFromWishList = async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const wishList = await WishList.findOne(userId);

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
        message: "Product not found in wishlist",
        // wishList,
      });
    }
    const upDatedWishList = await WishList.findOneAndUpdate(
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
      message: "Product remove from wishlist",
      wishList: upDatedWishList,
    });
    await upDatedWishList.save();
  } catch (err) {
    res.status(500).json({
      message: "Error: " + err.message,
    });
  }
};

exports.removeAllProductsFromWishList = async (req, res) => {
  try {
    const { userId } = req.params;
    const wishList = await WishList.findOne({ userId: userId });

    if (!wishList) {
      return res.status(404).json({
        message: "WishList not found",
      });
    }

    wishList.items = [];
    await wishList.save();

    res.status(200).json({
      message: "All products removed from wishlist",
      wishList: wishList,
    });
  } catch (err) {
    res.status(500).json({
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
        message: "WishList not found",
      });
    }
    res.status(200).json({
      message: "WishList cleared",
    });
  } catch (err) {
    res.status(500).json({
      message: "Error: " + err.message,
    });
  }
};

exports.isInWishList = async (req, res) => {
  try {
    const { productId } = req.params;
    const { userId } = req.body;

    const wishList = await WishList.findOne(
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
    });
  } catch (err) {
    res.status(500).json({
      message: "Error: " + err.message,
    });
  }
};
