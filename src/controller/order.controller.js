const Order = require("../models/order");
const Product = require("../models/product");
const ShippingAddress = require("../models/shippingAddress");
exports.createOrderAA = async (req, res) => {
  try {
    const { userId, items, shippingAddressId, totalAmount } = req.body;
    const spAdId = await ShippingAddress.findById(shippingAddressId);
    if (!spAdId) {
      return res.status(404).json({
        message: "Shipping Address Not Found",
      });
    }
    let total = 0;
    for (const item of items) {
      // check if product exist or not
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      total += product.price * item.quantity;

      if (total !== totalAmount) {
        return res.status(400).json({
          message: "Total Amount not match",
        });
      }
    }
    const order = new Order({
      userId: userId,
      items: items,
      shippingAddressId: shippingAddressId,
      totalAmount: total,
    });
    await order.save();
    res.status(201).json({
      message: "Order placed sucessfully",
      order,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error: " + err.message,
    });
  }
};

exports.createOrder2 = async (req, res) => {
  try {
    const { items, shippingAddressId } = req.body;
    const userId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No order items provided",
      });
    }

    // Validate shipping address
    const shippingAddress = await ShippingAddress.findById(shippingAddressId);
    if (!shippingAddress) {
      return res.status(404).json({
        success: false,
        message: "Shipping address not found",
      });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
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

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product._id,
        productName: product.productName,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal,
      });
    }

    const order = await Order.create({
      userId,
      items: orderItems,
      shippingAddressId,
      totalAmount,
      status: "PENDING",
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({
      success: false,
      message: "Error creating order",
    });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddressId } = req.body;
    // const userId = req.user.id;
    const userId = req.body.userId;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No order items provided",
      });
    }

    const shippingAddress = await ShippingAddress.findById(shippingAddressId);
    if (!shippingAddress) {
      return res.status(404).json({
        success: false,
        message: "Shipping address not found",
      });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
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

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product._id,
        quantity: item.quantity,
        price: product.price,
      });
    }

    const order = await Order.create({
      userId,
      items: orderItems,
      shippingAddressId,
      totalAmount,
      orderStatus: "Processing",
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
    });
  }
};
