const express = require("express");
const brandController = require("../controller/brand.controller");
const router = express.Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const { brandUpload } = require("../config/multer");

router.get("/brand", brandController.get);
router.post(
  "/brand",
  auth.validate_token(),
  role(["admin"]),
  brandUpload.single("image"),
  brandController.create
);
router.put(
  "/brand/:id",
  auth.validate_token(),
  role(["admin"]),
  brandUpload.single("image"),
  brandController.update
);
router.delete(
  "/brand/:id",
  auth.validate_token(),
  role(["admin"]),
  brandController.delete
);
router.get("/brand/:id", brandController.getById);
module.exports = router;
