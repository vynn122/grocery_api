// const multer = require("multer");
// const { CloudinaryStorage } = require("multer-storage-cloudinary");
// const cloudinary = require("./cloudinary");

// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: "products",
//     allowed_formats: ["jpg", "jpeg", "png", "webp"],
//   },
// });

// module.exports = multer({ storage });

const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const cloudinary = require("./cloudinary");
const createMulterStorage = (folderName) => {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `grocery/${folderName}`,
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
    },
  });
};
const productUpload = multer({ storage: createMulterStorage("product") });
const userUpload = multer({ storage: createMulterStorage("user") });
const categoryUpload = multer({ storage: createMulterStorage("category") });
const brandUpload = multer({ storage: createMulterStorage("brand") });

module.exports = { productUpload, userUpload, categoryUpload, brandUpload };
