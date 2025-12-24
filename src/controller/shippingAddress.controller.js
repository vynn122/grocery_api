const ShippingAddress = require("../models/shippingAddress");
exports.createShippingAddress = async (req, res) => {
  try {
    const { userId, fullName, phone, address, city, postalCode, country } =
      req.body;
    const newAddress = new ShippingAddress({
      userId: userId,
      fullName: fullName,
      phone: phone,
      address: address,
      city: city,
      postalCode: postalCode,
      country: country,
    });
    await newAddress.save();
    res.status(201).json({
      message: "Address created sucessful",
      newAddress,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error: " + err.message,
    });
  }
};
