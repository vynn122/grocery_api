const Payment = require("../models/payment");
const Order = require("../models/order");
const Product = require("../models/product");
const Cart = require("../models/cart");
const PromoCode = require("../models/promoCode");

const { BakongKHQR, khqrData, IndividualInfo } = require("bakong-khqr");
const BAKONG_BASE_URL = process.env.BAKONG_PROD_BASE_API_URL;
// const BAKONG_BASE_URL = process.env.BAKONG_DEV_BASE_API_URL;
const BAKONG_ACCESS_TOKEN = process.env.BAKONG_ACCESS_TOKEN;

// Conversion rate USD -> KHR (now no need bro all product is riel)
const KHR_EXCHANGE_RATE = 4100;

exports.createPayment = async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;
    const userId = req.user._id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.orderStatus === "Cancelled") {
      return res
        .status(400)
        .json({ success: false, message: "Order is cancelled" });
    }

    if (!order.totalAmount || order.totalAmount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order amount" });
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

    // Convert amount to KHR and round to integer
    const amountKHR = Math.round(order.totalAmount * KHR_EXCHANGE_RATE);

    const optionalData = {
      currency: khqrData.currency.khr,
      amount: order.totalAmount,
      expirationTimestamp,
    };

    const individualInfo = new IndividualInfo(
      process.env.BAKONG_ACCOUNT_USERNAME,
      "Hem Theavin",
      "BATTAMBANG",
      optionalData,
    );
    // let existingPayment = await Payment.findOne({ orderId });
    // if (existingPayment) {
    //   if (Date.now() > existingPayment.payment.expiration) {
    //     // Expired → generate new QR
    //     const qrData = khqr.generateIndividual(individualInfo);
    //     existingPayment.payment.qr = qrData.data.qr;
    //     existingPayment.payment.expiration = Date.now() + 5 * 60 * 1000;
    //     await existingPayment.save();
    //     return res
    //       .status(200)
    //       .json({ success: true, payment: existingPayment });
    //   } else {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Payment already exists for this order",
    //     });
    //   }
    // }

    const khqr = new BakongKHQR();
    const qrData = khqr.generateIndividual(individualInfo);

    console.log("qrData response:", qrData);

    if (!qrData?.data || qrData.status?.code !== 0) {
      return res.status(400).json({
        success: false,
        message: `Failed to generate KHQR: ${
          qrData?.status?.message || "Unknown error"
        }`,
      });
    }

    const deepLink = `bakong://khqr?qr=${encodeURIComponent(qrData.data.qr)}`;
    const deepLinkWeb = `https://www.bakong.com.kh/khqr?qr=${encodeURIComponent(
      qrData.data.qr,
    )}`;

    const payment = await Payment.create({
      userId,
      orderId,
      paymentMethod,
      paymentStatus: "Pending",
      amountPaid: order.totalAmount,
      payment: {
        // amount: amountKHR,
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
    res
      .status(500)
      .json({ success: false, message: "Failed to create payment" });
  }
};
exports.checkPayment = async (req, res) => {
  try {
    const { md5 } = req.body;
    if (!md5)
      return res
        .status(400)
        .json({ success: false, message: "md5 is required" });
    const payment = await Payment.findOne({ "payment.md5": md5 });
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    const order = await Order.findById(payment.orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (payment.payment.paid) {
      return res
        .status(200)
        .json({ success: true, message: "Payment already confirmed" });
    }

    if (Date.now() > payment.payment.expiration) {
      if (order.orderStatus === "Pending") {
        order.orderStatus = "Cancelled";
        await order.save();
      }

      return res
        .status(400)
        .json({ success: false, message: "QR expired — order cancelled" });
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
      },
    );

    const data = await response.json();

    // 3️ payment not completed
    if (data.responseCode !== 0 || !data.data?.hash) {
      if (order.orderStatus === "Pending") {
        order.orderStatus = "Cancelled";
        await order.save();
      }

      return res
        .status(400)
        .json({ success: false, message: "Payment not completed" });
    }
    for (const item of order.items) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity, sold: item.quantity } },
      );

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: "Insufficient stock during payment confirmation",
        });
      }
    }

    payment.paymentStatus = "Paid";
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

    // update promo
    // if (order) promo.usedCount += 1;
    // promo.usedBy.push(order.userId);
    // await promo.save();e
    // after payment is marked Paid

    if (order.promoId) {
      const promo = await PromoCode.findById(order.promoId);

      if (promo) {
        if (!promo.usedBy.includes(order.userId)) {
          promo.usedCount += 1;
          promo.usedBy.push(order.userId);
          await promo.save();
        }
      }
    }

    // clear cart
    await Cart.deleteMany({ userId: payment.userId });

    // update order
    order.orderStatus = "Processing";
    await order.save();

    // deduct stock
    // for (const item of order.items) {
    //   await Product.findByIdAndUpdate(item.productId, {
    //     $inc: { stock: -item.quantity },
    //   });
    // }
    // for (const item of order.items) {
    //   const updated = await Product.findOneAndUpdate(
    //     {
    //       _id: item.productId,
    //       stock: { $gte: item.quantity },
    //     },
    //     {
    //       $inc: {
    //         stock: -item.quantity,
    //         sold: item.quantity,
    //       },
    //     }
    //   );

    //   if (!updated) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Insufficient stock during payment confirmation",
    //     });
    //   }
    // }

    res.status(200).json({ success: true, message: "Payment confirmed" });
  } catch (error) {
    console.error("Check payment error:", error);
    res
      .status(500)
      .json({ success: false, message: "Payment verification failed" });
  }
};

// exports.checkPaymentZin = async (req, res) => {
//   try {
//     const { md5 } = req.body;

//     const payment = await Payment.findOne({ "payment.md5": md5 });
//     if (!payment) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Payment not found" });
//     }

//     if (payment.payment.paid) {
//       return res
//         .status(200)
//         .json({ success: true, message: "Payment already confirmed" });
//     }

//     const response = await fetch(
//       `${BAKONG_BASE_URL}/check_transaction_by_md5`,
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${BAKONG_ACCESS_TOKEN}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ md5 }),
//       }
//     );

//     const data = await response.json();

//     if (data.responseCode !== 0 || !data.data?.hash) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Payment not completed" });
//     }

//     // update payment
//     payment.paymentStatus = "Paid";
//     payment.paidAt = new Date();
//     payment.payment = {
//       ...payment.payment,
//       paid: true,
//       paidAt: new Date(),
//       bakongHash: data.data.hash,
//       fromAccountId: data.data.fromAccountId,
//       toAccountId: data.data.toAccountId,
//       transactionId: data.data.transactionId,
//       externalRef: data.data.externalRef,
//     };
//     await payment.save();

//     // clear cart
//     await Cart.deleteMany({ userId: payment.userId });

//     // update order status
//     const order = await Order.findById(payment.orderId);
//     order.orderStatus = "Processing";
//     await order.save();

//     // deduct stock
//     for (const item of order.items) {
//       await Product.findByIdAndUpdate(item.productId, {
//         $inc: { stock: -item.quantity },
//       });
//     }

//     res.status(200).json({ success: true, message: "Payment confirmed" });
//   } catch (error) {
//     console.error("Check payment error:", error);
//     res
//       .status(500)
//       .json({ success: false, message: "Payment verification failed" });
//   }
// };
// exports.checkPaymentz = async (req, res) => {
//   try {
//     const { md5 } = req.body;
//     if (!md5)
//       return res
//         .status(400)
//         .json({ success: false, message: "md5 is required" });

//     const payment = await Payment.findOne({ "payment.md5": md5 });
//     if (!payment)
//       return res
//         .status(404)
//         .json({ success: false, message: "Payment not found" });

//     const response = await fetch(
//       `${BAKONG_BASE_URL}/check_transaction_by_md5`,
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${BAKONG_ACCESS_TOKEN}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ md5: payment.payment.md5 }),
//       }
//     );

//     const data = await response.json();
//     console.log("Bakong response:", data);

//     if (data.responseCode !== 0 || !data.data?.hash) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Payment not completed" });
//     }

//     // update payment status...

//     res.status(200).json({ success: true, message: "Payment confirmed" });
//   } catch (error) {
//     console.error("Check payment error:", error);
//     res
//       .status(500)
//       .json({ success: false, message: "Payment verification failed" });
//   }
// };
