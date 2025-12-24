const Payment = require("../models/payment");
const Order = require("../models/order");
const Product = require("../models/product");
const { BakongKHQR, khqrData, IndividualInfo } = require("bakong-khqr");
// const BAKONG_BASE_URL = process.env.BAKONG_PROD_BASE_API_URL;
const BAKONG_BASE_URL = process.env.BAKONG_DEV_BASE_API_URL;
const BAKONG_ACCESS_TOKEN = process.env.BAKONG_ACCESS_TOKEN;

exports.createPayment = async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;
    const userId = req.user.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order is cancelled",
      });
    }

    // prevent duplicate payment
    const existingPayment = await Payment.findOne({ orderId });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment already exists for this order",
      });
    }

    // KHQR expiration (5 minutes)
    const expirationTimestamp = Date.now() + 5 * 60 * 1000;

    const optionalData = {
      currency: khqrData.currency.khr,
      amount: order.totalAmount,
      expirationTimestamp,
    };

    const individualInfo = new IndividualInfo(
      process.env.BAKONG_ACCOUNT_USERNAME,
      "Hem Theavin",
      "BATTAMBANG",
      optionalData
    );

    const khqr = new BakongKHQR();
    const qrData = khqr.generateIndividual(individualInfo);

    if (!qrData.data || qrData.status?.code !== 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to generate KHQR",
      });
    }

    const deepLink = `bakong://khqr?qr=${encodeURIComponent(qrData.data.qr)}`;
    const deepLinkWeb = `https://www.bakong.com.kh/khqr?qr=${encodeURIComponent(
      qrData.data.qr
    )}`;

    const payment = await Payment.create({
      userId,
      orderId,
      paymentMethod,
      paymentStatus: "Pending",
      amountPaid: order.totalAmount,
      payment: {
        amount: order.totalAmount,
        method: "KHQR",
        currency: "KHR",
        qr: qrData.data.qr,
        md5: qrData.data.md5,
        expiration: expirationTimestamp,
        paid: false,
        deepLink,
        deepLinkWeb,
      },
    });

    res.status(201).json({
      success: true,
      message: "Payment created",
      payment,
    });
  } catch (error) {
    console.error("Create payment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment",
    });
  }
};

exports.checkPayment = async (req, res) => {
  try {
    const { md5 } = req.body;

    const payment = await Payment.findOne({ "payment.md5": md5 });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.payment.paid) {
      return res.status(200).json({
        success: true,
        message: "Payment already confirmed",
      });
    }

    const response = await fetch(
      `${BAKONG_BASE_URL}/check_transaction_by_md5`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${BAKONG_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ md5 }),
      }
    );

    const data = await response.json();

    if (data.responseCode !== 0 || !data.data?.hash) {
      return res.status(400).json({
        success: false,
        message: "Payment not completed",
      });
    }

    // update payment
    payment.paymentStatus = "Paid";
    payment.paidAt = new Date();
    payment.payment = {
      ...payment.payment,
      paid: true,
      paidAt: new Date(),
      bakongHash: data.data.hash,
      fromAccountId: data.data.fromAccountId,
      toAccountId: data.data.toAccountId,
      transactionId: data.data.transactionId,
      externalRef: data.data.externalRef,
    };
    await payment.save();

    // update order (payment success)
    const order = await Order.findById(payment.orderId);
    order.orderStatus = "Processing"; // still processing, not shipped yet
    await order.save();

    // deduct stock ONCE
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity },
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment confirmed",
    });
  } catch (error) {
    console.error("Check payment error:", error);
    res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};
