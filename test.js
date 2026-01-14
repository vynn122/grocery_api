// const bcrypt = require("bcrypt");

// async function test() {
//   const password = "123";
//   const hash = await bcrypt.hash("123", 10);
//   const match = await bcrypt.compare("123", hash);

//   console.log("Password:", password);
//   console.log("Hash:", hash);
//   console.log("Match:", match); // Should be true
// }

// test();

const bcrypt = require("bcrypt");

const hashFromDB =
  "$2b$10$5gDAWRhZWvNnugSw9KQ/uOXibzg4GoVtldpNls8/rRLl36Uc0U9u6";

async function findPassword() {
  const commonPasswords = [
    "123",
    "1234",
    "12345",
    "123456",
    "1234567",
    "12345678",
    "password",
    "Password",
    "password123",
    "Password123",
    "test",
    "Test",
    "test123",
    "Test123",
    "admin",
    "Admin",
    "admin123",
    "Admin123",
    "theavin90",
    "Theavin90",
  ];

  console.log("Testing passwords against your hash...\n");

  for (const password of commonPasswords) {
    const isMatch = await bcrypt.compare(password, hashFromDB);
    if (isMatch) {
      console.log(`✓ FOUND IT! The password is: "${password}"`);
      return;
    } else {
      console.log(`✗ Not: "${password}"`);
    }
  }

  console.log("\n❌ Password not found in common list");
}

findPassword();
