const mongoose = require("mongoose");
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    sold: {
      type: Number,
      default: 0,
    },
    stock: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      default: 0,
    },
    sku: {
      type: String,
      // required: true,
    },
    image: [{ type: String }],
    tags: [{ type: String, required: true }],
  },
  { timestamps: true }
);
//
// VIRTUAL FIELD: FINAL PRICE
//
productSchema.virtual("finalPrice").get(function () {
  if (!this.discount || this.discount === 0) return this.price;

  return this.price - (this.price * this.discount) / 100;
});

//
// ENABLE VIRTUALS IN RESPONSE
//
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });
module.exports = mongoose.model("Product", productSchema);
