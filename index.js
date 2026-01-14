require("dotenv").config();

const express = require("express");
// const dotenv = require("dotenv");
const dbConfig = require("./src/config/database");
const productRoute = require("./src/routes/product.route");
const categoryRoute = require("./src/routes/category.route");
const brandRoute = require("./src/routes/brand.route");
const userRoute = require("./src/routes/user.route");
const cartRoute = require("./src/routes/cart.route");
const wishListRoute = require("./src/routes/wishList.route");
const orderRoute = require("./src/routes/order.route");
const ShippingAddressRoute = require("./src/routes/shippingAddress.route");
const authRoute = require("./src/routes/auth.route");
const promoRoute = require("./src/routes/promocode.route");
const paymentRoute = require("./src/routes/payment.route");
const reviewRouter = require("./src/routes/review.route");

const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();
// dotenv.config();
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

dbConfig();

app.get("/", (req, res) => {
  res.send("Hello brother");
});

app.use("/api", [
  userRoute,
  productRoute,
  categoryRoute,
  brandRoute,
  cartRoute,
  wishListRoute,
  orderRoute,
  ShippingAddressRoute,
  authRoute,
  promoRoute,
  paymentRoute,
  reviewRouter,
]);
// app.use("/api", require("./src/routes/product.route"));
// app.use("/api", require("./src/routes/category.route"));

app.listen(process.env.PORT, () => {
  console.log(`Server is runnning on port ${process.env.PORT}`);
});
