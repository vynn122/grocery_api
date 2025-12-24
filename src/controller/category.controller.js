const Category = require("../models/category");
const cloudinary = require("../config/cloudinary");

exports.get = async (req, res) => {
  try {
    const category = await Category.find();
    if (category.length < 1) {
      res.status(200).json({
        success: false,
        message: "no category yet",
      });
      return;
    }
    res.status(200).json({
      success: true,
      message: "category retrieve successfull",
      category,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error: " + err.message,
    });
  }
};

exports.createZIN = async (req, res) => {
  try {
    const existingCategory = await Category.findOne({ name: req.body.name });
    if (existingCategory) {
      return res.status(400).json({
        message: "Category already exists",
      });
    }
    const category = new Category(req.body);
    await category.save();
    res.status(201).json({
      success: true,
      message: "Category create succesfull",
      category,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error: " + err.message,
    });
  }
};
exports.updateZIn = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Category update successful",
      category,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error: " + err.message,
    });
  }
};
exports.deleteZin = (req, res) => {
  Category.findByIdAndDelete(req.params.id)
    .then((category) => {
      if (!category) {
        return res.status(404).json({
          success: false,

          message: "Category not found",
        });
      }
      res.status(200).json({
        success: true,
        message: "Category delete successful",
        category,
      });
    })
    .catch((err) => {
      res.status(500).json({
        success: false,
        message: "Error: " + err.message,
      });
    });
};
exports.getById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Category retrieve successful",
      category,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error: " + err.message,
    });
  }
};

exports.create = async (req, res) => {
  try {
    const body = req.body || {};

    const name = body.name;
    const description = body.description || "";
    const isActive =
      body.isActive !== undefined ? Boolean(body.isActive) : true;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    let image = null;
    if (req.file) {
      image = req.file.path;
    }

    // Create category
    const category = new Category({
      name,
      image,
      description,
      isActive,
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Update fields if provided
    if (body.name !== undefined) category.name = body.name;
    if (body.description !== undefined) category.description = body.description;
    if (body.isActive !== undefined) category.isActive = Boolean(body.isActive);

    // Update image (Cloudinary)
    if (req.file) {
      category.image = req.file.path;
    }

    await category.save();

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.delete2 = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    if (category.image) {
      const publicId = category.image
        .split("/")
        .slice(-2)
        .join("/")
        .split(".")[0];

      await cloudinary.uploader.destroy(publicId);
    }

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: `Category ${category.name} deleted successfully`,
    });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({
      message: "Error: " + err.message,
    });
  }
};
exports.delete = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (category.image) {
      const publicId = category.image
        .split("/")
        .slice(-2)
        .join("/")
        .split(".")[0];

      await cloudinary.uploader.destroy(publicId);
    }

    res.status(200).json({
      message: `Category "${category.name}" deleted successfully`,
    });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ message: "Error: " + err.message });
  }
};
