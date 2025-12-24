require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./src/models/user");

async function run() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running this script."
    );
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  const exists = await User.findOne({ email });
  if (exists) {
    console.log("Admin already exists:", exists.email);
    process.exit(0);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = new User({
    email,
    fullName: "Admin",
    password: passwordHash,
    role: "admin",
    isVerified: true,
  });
  await user.save();
  console.log("Admin created:", email);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
