// const mongoose = require("mongoose");
// const OrderSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//   },
//   items: [
//     {
//       productId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Product",
//         required: true,
//       },
//       quantity: {
//         type: Number,
//         required: true,
//       },
//       price: {
//         type: Number,
//         required: true,
//       },
//     },
//   ],
//   paymentId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Payment",
//   },
//   orderStatus: {
//     type: String,
//     enum: ["Processing", "Shipped", "Deliverd", "Cancelled"],
//     default: "Processing",
//   },
//   totalAmount: {
//     type: Number,
//     required: true,
//   },
//   shippingAddressId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "ShippingAddress",
//   },
// });
// module.exports = mongoose.model("Order", OrderSchema);
const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true, // snapshot price
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    // shippingAddressId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "ShippingAddress",
    //   required: true,
    // },

    orderStatus: {
      type: String,
      enum: ["Processing", "Pending", "Completed", "Delivered", "Cancelled"],
      default: "Pending",
    },
    promoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PromoCode",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
