const express = require("express");
const productController = require("../controller/product.controller");
// const upload = require("../config/multer"); // multer config
const { productUpload } = require("../config/multer");
const { validate_token } = require("../middleware/auth");
const role = require("../middleware/role");

const router = express.Router();
router.get("/product", productController.get);
// router.post("/product", upload.array("image", 10), productController.create);
router.get("/product/:id", productController.getById);

// router.use(validate_token(), role(["admin"]));
router.post(
  "/product",
  validate_token(),
  role(["admin"]),
  productUpload.array("image", 5),
  productController.create
);
router.put(
  "/product/:id",
  validate_token(),
  role(["admin"]),
  productUpload.array("image", 5),
  productController.update
);
router.delete(
  "/product/:id",
  validate_token(),
  role(["admin"]),
  productController.delete
);

module.exports = router;
