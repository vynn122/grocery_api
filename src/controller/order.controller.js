const Order = require("../models/order");
const Product = require("../models/product");
const ShippingAddress = require("../models/shippingAddress");
const PromoCode = require("../models/promoCode");
const Payment = require("../models/payment");
const Cart = require("../models/cart");
const payment = require("../models/payment");
const Review = require("../models/review");

let promoId = null;

exports.createOrder = async (req, res) => {
  try {
    const { items, promoCode, totalAmount, addressId } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }
    const userId = req.user._id;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items provided",
      });
    }

    // Fetch products
    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    if (products.length !== items.length) {
      return res.status(400).json({
        success: false,
        message: "One or more products are invalid",
      });
    }

    // Validate items and calculate total
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = products.find((p) => p._id.toString() === item.productId);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.productId}`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.productName}`,
        });
      }

      const price = product.finalPrice ?? product.price;
      const subtotal = price * item.quantity;
      calculatedTotal += subtotal;

      validatedItems.push({
        productId: product._id,
        quantity: item.quantity,
        price,
        subtotal,
      });
    }

    // Promo code
    let discount = 0;
    if (promoCode) {
      const promo = await PromoCode.findOne({
        code: promoCode,
        isActive: true,
      });

      if (!promo) {
        return res.status(400).json({
          success: false,
          message: "Invalid promo code",
        });
      }
      if (promo.usedBy.includes(userId)) {
        return res.status(400).json({
          success: false,
          message: "You already used this promo code",
        });
      }

      if (promo.expiryDate < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Promo code has expired",
        });
      }

      if (promo.usedCount >= promo.usageLimit) {
        return res.status(400).json({
          success: false,
          message: "Promo code usage limit reached",
        });
      }

      if (promo.discountType === "percentage") {
        discount = Math.floor((promo.discountValue / 100) * calculatedTotal);
      } else if (promo.discountType === "fixed") {
        discount = promo.discountValue;
      }

      discount = Math.min(discount, calculatedTotal);
      promoId = promo._id;

      // promo.usedCount += 1;
      // promo.usedBy.push(userId);
      // await promo.save();
    }

    // Fees (still integers)
    const shipping = 0;
    const taxes = 0;
    const otherFee = 0;

    const finalTotal = calculatedTotal - discount + shipping + taxes + otherFee;

    // Validate client total
    if (finalTotal !== totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Total amount mismatch",
      });
    }

    // Create order
    const order = new Order({
      userId,
      items: validatedItems,
      promoCode: promoCode || null,
      discount,
      shipping,
      taxes,
      otherFee,
      orderStatus: "Pending",
      totalAmount: finalTotal,
      addressId,
      promoId,
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      orderId: order._id,
      finalTotal,
    });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({
      success: false,
      message: "Error creating order: " + err.message,
    });
  }
};

exports.getUserPaidOrders = async (req, res) => {
  try {
    const userId = req.user_id;
    const paidPayments = await Payment.find({
      userId: userId,
      paymentStatus: "Paid",
    }).populate({
      path: "orderId", // populate the order details
      populate: { path: "items.productId" }, // also populate products in the order
    });

    // Format the response if needed
    const orderHistory = paidPayments.map((payment) => ({
      order: payment.orderId, // the actual order details
      paymentMethod: payment.paymentMethod,
      paidAt: payment.paidAt,
      amountPaid: payment.amountPaid,
    }));

    return orderHistory;
  } catch (error) {
    console.error("Error fetching paid orders:", error);
    throw error;
  }
};
exports.getAllPaidOrders = async (req, res) => {
  try {
    const paidPayments = await Payment.find({ paymentStatus: "Paid" })
      .populate({
        path: "orderId",
        populate: { path: "items.productId" },
      })
      .populate("userId");

    // Map to a clean response
    const orders = paidPayments.map((payment) => ({
      orderId: payment.orderId._id,
      user: payment.userId,
      items: payment.orderId.items,
      totalAmount: payment.orderId.totalAmount,
      orderStatus: payment.orderId.orderStatus,
      paymentMethod: payment.paymentMethod,
      paidAt: payment.paidAt,
      amountPaid: payment.amountPaid,
    }));

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Error fetching paid orders:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching paid orders",
      error: error.message,
    });
  }
};

exports.getPaidOrdersForUser = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    const userId = req.user._id;

    const paidPayments = await Payment.find({
      userId: userId,
      paymentStatus: "Paid",
    })
      .populate({
        path: "orderId",
        populate: { path: "items.productId" },
      })
      .sort({ createdAt: -1 });

    const orders = await Promise.all(
      paidPayments.map(async (payment) => {
        const order = payment.orderId;

        const items = await Promise.all(
          order.items.map(async (item) => ({
            ...item.toObject(),
            isReviewed: !!(await Review.exists({
              userId,
              productId: item.productId._id,
              orderId: order._id,
            })),
          }))
        );

        return {
          orderId: order._id,
          items,
          totalAmount: order.totalAmount,
          itemCount: order.items.length,
          orderStatus: order.orderStatus,
          paymentMethod: payment.paymentMethod,
          paidAt: payment.paidAt,
          amountPaid: payment.amountPaid,
          createdAt: payment.createdAt,
        };
      })
    );

    // 3️⃣ Send final response with count and orders
    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Error fetching user paid orders:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user paid orders",
      error: error.message,
    });
  }
};

// exports.getPaidOrdersForUserZin = async (req, res) => {
//   try {
//     if (!req.user || !req.user._id) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized: User not authenticated",
//       });
//     }

//     const userId = req.user._id;

//     const paidPayments = await Payment.find({
//       userId: userId,
//       paymentStatus: "Paid",
//     })
//       .populate({
//         path: "orderId",
//         populate: { path: "items.productId" },
//       })
//       .sort({ createdAt: -1 });

//     const orders = paidPayments.map((payment) => ({
//       orderId: payment.orderId._id,
//       items: payment.orderId.items,
//       totalAmount: payment.orderId.totalAmount,
//       itemCount: payment.orderId.items.length,
//       orderStatus: payment.orderId.orderStatus,
//       paymentMethod: payment.paymentMethod,
//       paidAt: payment.paidAt,
//       amountPaid: payment.amountPaid,
//       createdAt: payment.createdAt,
//     }));

//     res.status(200).json({
//       success: true,
//       count: orders.length,
//       orders,
//     });
//   } catch (error) {
//     console.error("Error fetching user paid orders:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching user paid orders",
//       error: error.message,
//     });
//   }
// };

exports.getAllPurchasedItems = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    const userId = req.user._id;

    const paidPayments = await Payment.find({
      userId,
      paymentStatus: "Paid",
    })
      .populate({
        path: "orderId",
        populate: { path: "items.productId" },
      })
      .sort({ createdAt: -1 });

    const purchasedItems = [];
    paidPayments.forEach((payment) => {
      payment.orderId.items.forEach((item) => {
        purchasedItems.push({
          productId: item.productId._id,
          name: item.productId.productName,
          image: item.productId.image,
          price: item.productId.finalPrice ?? item.productId.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
          paidAt: payment.paidAt,
          orderId: payment.orderId._id,
        });
      });
    });

    res.status(200).json({
      success: true,
      count: purchasedItems.length,
      items: purchasedItems,
    });
  } catch (error) {
    console.error("Error fetching purchased items:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching purchased items",
      error: error.message,
    });
  }
};

// exports.createOrderAA = async (req, res) => {
//   try {
//     const { userId, items, shippingAddressId, totalAmount } = req.body;
//     const spAdId = await ShippingAddress.findById(shippingAddressId);
//     if (!spAdId) {
//       return res.status(404).json({
//         message: "Shipping Address Not Found",
//       });
//     }
//     let total = 0;
//     for (const item of items) {
//       // check if product exist or not
//       const product = await Product.findById(item.productId);
//       if (!product) {
//         return res.status(404).json({
//           message: "Product not found",
//         });
//       }

//       total += product.price * item.quantity;

//       if (total !== totalAmount) {
//         return res.status(400).json({
//           message: "Total Amount not match",
//         });
//       }
//     }
//     const order = new Order({
//       userId: userId,
//       items: items,
//       shippingAddressId: shippingAddressId,
//       totalAmount: total,
//     });
//     await order.save();
//     res.status(201).json({
//       message: "Order placed sucessfully",
//       order,
//     });
//   } catch (err) {
//     res.status(500).json({
//       message: "Error: " + err.message,
//     });
//   }
// };

// exports.createOrder2 = async (req, res) => {
//   try {
//     const { items, shippingAddressId } = req.body;
//     const userId = req.user.id;

//     if (!items || items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "No order items provided",
//       });
//     }

//     // Validate shipping address
//     const shippingAddress = await ShippingAddress.findById(shippingAddressId);
//     if (!shippingAddress) {
//       return res.status(404).json({
//         success: false,
//         message: "Shipping address not found",
//       });
//     }

//     let totalAmount = 0;
//     const orderItems = [];

//     for (const item of items) {
//       const product = await Product.findById(item.productId);

//       if (!product) {
//         return res.status(404).json({
//           success: false,
//           message: `Product not found: ${item.productId}`,
//         });
//       }

//       if (product.stock < item.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `Insufficient stock for ${product.productName}`,
//         });
//       }

//       const itemTotal = product.price * item.quantity;
//       totalAmount += itemTotal;

//       orderItems.push({
//         productId: product._id,
//         productName: product.productName,
//         price: product.price,
//         quantity: item.quantity,
//         total: itemTotal,
//       });
//     }

//     const order = await Order.create({
//       userId,
//       items: orderItems,
//       shippingAddressId,
//       totalAmount,
//       status: "PENDING",
//     });

//     res.status(201).json({
//       success: true,
//       message: "Order placed successfully",
//       order,
//     });
//   } catch (err) {
//     console.error("Create order error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Error creating order",
//     });
//   }
// };

// exports.createOrderdd = async (req, res) => {
//   try {
//     const { items, shippingAddressId } = req.body;
//     // const userId = req.user.id;
//     const userId = req.body.userId;

//     if (!items || items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "No order items provided",
//       });
//     }

//     const shippingAddress = await ShippingAddress.findById(shippingAddressId);
//     if (!shippingAddress) {
//       return res.status(404).json({
//         success: false,
//         message: "Shipping address not found",
//       });
//     }

//     let totalAmount = 0;
//     const orderItems = [];

//     for (const item of items) {
//       const product = await Product.findById(item.productId);

//       if (!product) {
//         return res.status(404).json({
//           success: false,
//           message: `Product not found: ${item.productId}`,
//         });
//       }

//       if (product.stock < item.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `Insufficient stock for ${product.productName}`,
//         });
//       }
//       product.stock -= item.quantity;
//       await product.save();

//       const itemTotal = product.finalPrice * item.quantity;
//       totalAmount += itemTotal;

//       orderItems.push({
//         productId: product._id,
//         quantity: item.quantity,
//         price: product.price,
//       });
//     }

//     const order = await Order.create({
//       userId,
//       items: orderItems,
//       shippingAddressId,
//       totalAmount,
//       orderStatus: "Processing",
//     });

//     res.status(201).json({
//       success: true,
//       message: "Order created successfully",
//       order,
//     });
//   } catch (error) {
//     console.error("Create order error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to create order",
//     });
//   }
// };

// exports.createOrderz = async (req, res) => {
//   try {
//     const { items, promoCode, totalAmount, addressId } = req.body;
//     if (!req.user || !req.user._id) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized: User not authenticated",
//       });
//     }
//     const userId = req.user._id;

//     // const address = await Address.findOne({ _id: addressId, userId });

//     // if (!address) {
//     //   return res
//     //     .status(400)
//     //     .json({ success: false, message: "Invalid address" });
//     // }

//     const productIds = items.map((item) => item.productId);
//     const products = await Product.find({ _id: { $in: productIds } });

//     if (products.length != items.length) {
//       return res
//         .status(400)
//         .json({ success: false, message: "One or more products are invalid" });
//     }
//     let calculatedTotal = 0;
//     const validatedItems = items.map((item) => {
//       const product = products.find((p) => p._id.toString() === item.productId);
//       if (!product) {
//         throw new Error("Product not found: " + item.productId);
//       }
//       const price = product.finalPrice;
//       const subtotal = price * item.quantity;
//       calculatedTotal += subtotal;
//       return {
//         productId: item.productId,
//         quantity: item.quantity,
//         price,
//         subtotal,
//       };
//     });
//     let discount = 0;

//     if (promoCode) {
//       const promo = await PromoCode.findOne({
//         code: promoCode,
//         isActive: true,
//       });
//       if (!promo) {
//         return res
//           .status(400)
//           .json({ success: false, message: "Invalid promo code" });
//       }

//       if (promo.expiryDate < new Date()) {
//         return res
//           .status(400)
//           .json({ success: false, message: "Promo code has expired" });
//       }
//       if (promo.usedCount >= promo.usageLimit) {
//         return res
//           .status(400)
//           .json({ success: false, message: "Promo code usage limit reached" });
//       }
//       if (promo.discountType == "percentage") {
//         discount = (promo.discountValue / 100) * calculatedTotal;
//       } else if (promo.discountType == "fixed") {
//         discount = promo.discountValue;
//       }
//       promo.usedCount += 1;
//       promo.usedBy.push(userId);
//       await promo.save();
//     }

//     const shipping = 0;
//     const estimatedTaxes = 0;
//     const otherFee = 0.0;

//     const finalTotal =
//       calculatedTotal - discount + shipping + estimatedTaxes + otherFee;
//     console.log(
//       "Final Total:",
//       finalTotal,
//       "Provided TotalAmount:",
//       totalAmount,
//       "Discount:",
//       discount
//     );
//     if (Math.abs(finalTotal - totalAmount) > 0.01) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Total amount mismatch" });
//     }

//     const order = new Order({
//       userId,
//       items: validatedItems,
//       // paymentId,
//       promoCode: promoCode || null,
//       discount,
//       orderStatus: "Processing",
//       totalAmount: finalTotal,
//       addressId,
//     });
//     await order.save();

//     // await Cart.deleteMany({ userId });
//     res.status(201).json({
//       success: true,
//       message: "Order created successfully",
//       orderId: order._id,
//     });
//   } catch (e) {
//     res
//       .status(500)
//       .json({ success: false, message: "Error creating order" + e.message });
//   }
// };

// exports.createOrderDouble = async (req, res) => {
//   try {
//     const { items, promoCode, totalAmount, addressId } = req.body;

//     if (!req.user || !req.user._id) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized: User not authenticated",
//       });
//     }
//     const userId = req.user._id;

//     // Validate shipping address
//     // const shippingAddress = await ShippingAddress.findById(addressId);
//     // if (!shippingAddress) {
//     //   return res.status(404).json({
//     //     success: false,
//     //     message: "Shipping address not found",
//     //   });
//     // }

//     if (!items || items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "No items provided",
//       });
//     }

//     // Fetch products
//     const productIds = items.map((i) => i.productId);
//     const products = await Product.find({ _id: { $in: productIds } });

//     if (products.length !== items.length) {
//       return res.status(400).json({
//         success: false,
//         message: "One or more products are invalid",
//       });
//     }

//     // Helper to round to 2 decimals
//     const round2 = (num) => Math.round(num * 100) / 100;

//     // Validate items and calculate total
//     let calculatedTotal = 0;
//     const validatedItems = [];

//     for (const item of items) {
//       const product = products.find((p) => p._id.toString() === item.productId);
//       if (!product) {
//         return res.status(400).json({
//           success: false,
//           message: `Product not found: ${item.productId}`,
//         });
//       }

//       if (product.stock < item.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `Insufficient stock for ${product.productName}`,
//         });
//       }

//       const price = product.finalPrice ?? product.price;
//       const subtotal = round2(price * item.quantity);
//       calculatedTotal += subtotal;

//       validatedItems.push({
//         productId: product._id,
//         quantity: item.quantity,
//         price,
//         subtotal,
//       });

//       // Optionally reduce stock
//       // product.stock -= item.quantity;
//       // await product.save();
//     }

//     // Promo code
//     let discount = 0;
//     if (promoCode) {
//       const promo = await PromoCode.findOne({
//         code: promoCode,
//         isActive: true,
//       });

//       if (!promo) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid promo code",
//         });
//       }

//       if (promo.expiryDate < new Date()) {
//         return res.status(400).json({
//           success: false,
//           message: "Promo code has expired",
//         });
//       }

//       if (promo.usedCount >= promo.usageLimit) {
//         return res.status(400).json({
//           success: false,
//           message: "Promo code usage limit reached",
//         });
//       }

//       if (promo.discountType === "percentage") {
//         discount = round2((promo.discountValue / 100) * calculatedTotal);
//       } else if (promo.discountType === "fixed") {
//         discount = round2(promo.discountValue);
//       }

//       // Cap discount so final total is not negative
//       discount = Math.min(discount, calculatedTotal);

//       promo.usedCount += 1;
//       promo.usedBy.push(userId);
//       await promo.save();
//     }

//     // Fees
//     const shipping = 0;
//     const taxes = 0;
//     const otherFee = 0;

//     const finalTotal = round2(
//       calculatedTotal - discount + shipping + taxes + otherFee
//     );

//     // Optional: validate client total
//     if (Math.abs(finalTotal - totalAmount) > 0.01) {
//       return res.status(400).json({
//         success: false,
//         message: "Total amount mismatch",
//       });
//     }

//     // Create order
//     const order = new Order({
//       userId,
//       items: validatedItems,
//       promoCode: promoCode || null,
//       discount,
//       shipping,
//       taxes,
//       otherFee,
//       orderStatus: "Processing",
//       totalAmount: finalTotal,
//       addressId,
//     });

//     await order.save();

//     // Optional: clear cart
//     // await Cart.deleteMany({ userId });

//     res.status(201).json({
//       success: true,
//       message: "Order created successfully",
//       orderId: order._id,
//       finalTotal,
//     });
//   } catch (err) {
//     console.error("Create order error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Error creating order: " + err.message,
//     });
//   }
// };
