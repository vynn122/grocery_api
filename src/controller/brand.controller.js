const Brand = require("../models/brand");
/*
  Without new: true → Mongoose updates the document in the database ✅, but it gives you back the old version of the document.
  With new: true → Mongoose updates the document in the database ✅, and it gives you back the newly updated version of the document.

*/

exports.get = async (req, res) => {
  try {
    const brands = await Brand.find();
    if (brands.length < 1) {
      res.status(200).json({
        message: "No brand yet",
      });
      return;
    }
    res.status(200).json({
      success: true,
      message: "Brand Retrive successful",
      brands,
    });
  } catch (err) {
    res.status(500).json({
      success: false,

      message: "Error:" + err.message,
    });
  }
};
exports.create = async (req, res) => {
  try {
    const existingBrand = await Brand.findOne({ name: req.body.name });
    if (existingBrand) {
      return res.status(400).json({
        message: `Brand ${existingBrand.name} already exists`,
      });
    }
    let image = null;
    if (req.file) {
      image = req.file.path;
    }

    const brand = new Brand({ ...req.body, image });
    await brand.save();
    res.status(201).json({
      success: true,

      message: "Brand create successfull",
      brand,
    });
  } catch (err) {
    res.status(500).json({
      success: false,

      messgae: "Error: " + err.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }
    if (body.name !== undefined) brand.name = body.name;
    if (body.origin_country !== undefined)
      brand.origin_country = body.origin_country;
    if (body.description !== undefined) brand.description = body.description;

    if (req.file) {
      brand.image = req.file.path;
    }

    await brand.save();
    res.status(200).json({
      success: true,
      message: "Brand updated successful",
      brand,
    });

    res;
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error: " + err.message,
    });
  }
};

exports.updateZin = async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }
    res.status(200).json({
      success: true,

      message: "Brand update successful",
      brand,
    });
  } catch (err) {
    res.status(500).json({
      success: false,

      message: "Error: " + err.message,
    });
  }
};

// exports.deleteZin = async (req, res) => {
//   try {
//     await Brand.findByIdAndDelete(req.params.id).then((brand) => {
//       if (!brand) {
//         return res.status(404).json({
//           success: false,
//           message: "Brand not found",
//         });
//       }
//       res.status(200).json({
//         success: true,
//         message: `Brand ${brand.name} delete successful`,
//       });
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: "Error: " + err.message,
//     });
//   }
// };

exports.delete = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    if (brand.image) {
      const publicId = brand.image.split("/").slice(-2).join("/").split(".")[0];

      await cloudinary.uploader.destroy(publicId);
    }

    await Brand.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `brand ${brand.name} deleted successfully`,
    });
  } catch (err) {
    console.error("ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Error: " + err.message,
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Brand retrieve successful",
      brand,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error: " + err.message,
    });
  }
};
