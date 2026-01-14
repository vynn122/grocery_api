const express = require("express");
const {
  applyPromoCode,
  getAllPromoCodes,
  createPromoCode,
} = require("../controller/promocode.controller");
const { validate_token } = require("../middleware/auth");
const role = require("../middleware/role");

const router = express.Router();

router.post(
  "/create_promo",
  validate_token(),
  role(["admin"]),
  createPromoCode
);
router.post("/apply_promocode", validate_token(), applyPromoCode);
router.get("/getAllPromo", getAllPromoCodes);

module.exports = router;
