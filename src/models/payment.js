// const mongoose = require("mongoose");

// const paymentShema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   orderId: {
//     type: String,
//     ref: "Order",
//     required: true,
//   },
//   paymentMethod: {
//     type: String,
//     enum: ["ABA", "ACLEDA", "CASH ON HAND"],
//     required: true,
//   },
//   paymentStatus: {
//     type: String,
//     enum: ["Pending", "Paid", "Failed"],
//     default: "Pending",
//   },
//   transactionId: {
//     type: String,
//   },
//   amountPaid: {
//     type: Number,
//     required: true,
//   },
//   paidAt: {
//     type: Date,
//   },
//   payment: {
//     amount: { type: Number, required: true },
//     method: { type: String, enum: ["KHQR", "USD"], default: "KHQR" },
//     currency: { type: String, enum: ["KHR", "USD"], default: "KHR" },
//     qr: { type: String },
//     md5: { type: String },
//     expiration: { type: Number },
//     bakongHash: { type: String },
//     fromAccountId: { type: String },
//     toAccountId: { type: String },
//     transactionId: { type: String },
//     externalRef: { type: String },
//     paid: { type: Boolean, default: false },
//     paidAt: { type: Date },
//     deepLink: { type: String },
//     deepLinkWeb: { type: String },
//   },
// });
// module.exports = mongoose.model("Payment", paymentShema);
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
      unique: true,
    },

    paymentMethod: {
      type: String,
      enum: ["ABA", "ACLEDA", "CASH_ON_HAND", "KHQR"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },

    amountPaid: {
      type: Number,
      required: true,
      min: 0,
    },

    paidAt: Date,

    payment: {
      amount: { type: Number, required: true },
      method: {
        type: String,
        enum: ["KHQR", "USD"],
        default: "KHQR",
      },
      currency: {
        type: String,
        enum: ["KHR", "USD"],
        default: "KHR",
      },

      qr: String,
      md5: String,
      expiration: Number,

      bakongHash: String,
      fromAccountId: String,
      toAccountId: String,
      transactionId: String,
      externalRef: String,

      paid: { type: Boolean, default: false },
      paidAt: Date,

      deepLink: String,
      deepLinkWeb: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
