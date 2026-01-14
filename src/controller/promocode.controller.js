const PromoCode = require("../models/promoCode");

// create promo code
exports.createPromoCode = async (req, res) => {
  try {
    const promo = new PromoCode({ ...req.body });
    await promo.save();
    res
      .status(201)
      .json({ success: true, message: "Promo code created successfully" });
  } catch (e) {
    res.status(400).json({
      success: false,
      message: "Error creating procode: " + e.message,
    });
  }
};

// get all promo codes
exports.getAllPromoCodes = async (req, res) => {
  try {
    const promos = await PromoCode.find();
    res.status(200).json({ success: true, promos });
  } catch (e) {
    res.status(400).json({
      success: false,
      message: "Error fetching procode: " + e.message,
    });
  }
};

// apply promo code
exports.applyPromoCode = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user?._id;

    const promo = await PromoCode.findOne({ code });

    if (!promo || !promo.isActive) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid promo code" });
    }

    if (promo.expiryDate < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "Promo code expired" });
    }

    if (promo.usedCount >= promo.usageLimit) {
      return res
        .status(400)
        .json({ success: false, message: "Promo code usage limit reached" });
    }

    if (promo.usedBy.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "You have already used this promo code",
      });
    }
    // increment usedCount and add user to usedBy
    // await PromoCode.updateOne(
    //   { _id: promo._id },
    //   {
    //     $inc: { usedCount: 1 },
    //     $push: { usedBy: userId },
    //   }
    // );

    // if (promo.usedBy.includes(userId)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "You have already used this promo code",
    //   });
    // }

    // increment usedCount and add user to usedBy
    // promo.usedCount += 1;
    // promo.usedBy.push(userId);
    // await promo.save();

    res.status(200).json({
      success: true,
      message: "Promo code applied",
      discountType: promo.discountType,
      discountValue: promo.discountValue,
    });
  } catch (e) {
    res.status(400).json({
      success: false,
      message: "Error applying procode: " + e.message,
    });
  }
};
