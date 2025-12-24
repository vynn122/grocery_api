const express = require("express");
const categoryController = require("../controller/category.controller");
const { validate_token } = require("../middleware/auth");
const role = require("../middleware/role");
const { categoryUpload } = require("../config/multer");

const router = express.Router();

router.get("/category", categoryController.get);
router.post(
  "/category",
  validate_token(),
  role(["admin"]),
  categoryUpload.single("image"),
  categoryController.create
);
router.put(
  "/category/:id",
  validate_token(),
  role(["admin"]),
  categoryUpload.single("image"),
  categoryController.update
);
router.delete(
  "/category/:id",
  validate_token(),
  role(["admin"]),
  categoryController.delete
);
router.get("/category/:id", categoryController.getById);

module.exports = router;
