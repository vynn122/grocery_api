const Product = require("../models/product");
const Category = require("../models/category");
const Brand = require("../models/brand");
const cloudinary = require("../config/cloudinary");

// "$gte" = greater than or equal (>=)

// "$lte" = less than or equal (<=)
exports.get = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const totalProduct = await Product.countDocuments();
    const { category, brand, minPrice, maxPrice, search, sort } = req.query;
    const { best_selling, top_rated } = req.query;
    let filter = {};
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    // if (search) {
    //   filter.$or = [
    //     { name: { $regex: search, $options: "i" } },
    //     { description: { $regex: search, $options: "i" } },
    //   ];
    // }
    if (search) {
      filter.name = {
        $regex: search,
        $options: "i",
      };
    }

    // -1 mean newest desc
    let sortOption = {};
    if (sort === "price_asc") sortOption.price = 1;
    else if (sort === "price_desc") sortOption.price = -1;
    else if (sort === "newest") sortOption.createdAt = -1;
    else if (sort === "best_selling") sortOption.sold = -1;
    else if (sort === "top_rated") sortOption.rating = -1;

    const products = await Product.find(filter)
      .populate("category", "_id name")
      .populate("brand", "_id name")
      .skip(skip)
      .sort(sortOption)
      .limit(limit);
    if (products.length < 1) {
      return res.status(200).json({
        message: "No product yet",
        products: [],
        totalProduct,
        totalPages: Math.ceil(totalProduct / limit),
        currentPage: page,
      });
    }
    res.status(200).json({
      success: true,
      message: "product retrieve successful",
      products,
      pagination: [
        {
          totalProduct,
          totalPages: Math.ceil(totalProduct / limit),
          currentPage: page,
        },
      ],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error: " + err.message,
    });
  }
};
exports.gets = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { category, brand, minPrice, maxPrice, search } = req.query;

    // Build filter
    let filter = {};

    // --- CATEGORY ---
    if (category) {
      // Try to find category by name first
      let cat = await Category.findOne({ name: category });
      if (!cat) {
        // If not found by name, maybe it's an ObjectId string
        const isValidId = /^[0-9a-fA-F]{24}$/.test(category);
        if (isValidId) cat = { _id: category };
      }
      if (cat) filter.category = cat._id;
      else {
        // Category not found → return empty result
        return res.status(200).json({
          message: "No products found for this category",
          products: [],
          totalProduct: 0,
          totalPages: 0,
          currentPage: page,
        });
      }
    }

    // --- BRAND ---
    if (brand) {
      let b = await Brand.findOne({ name: brand });
      if (!b) {
        const isValidId = /^[0-9a-fA-F]{24}$/.test(brand);
        if (isValidId) b = { _id: brand };
      }
      if (b) filter.brand = b._id;
      else {
        // Brand not found → return empty result
        return res.status(200).json({
          message: "No products found for this brand",
          products: [],
          totalProduct: 0,
          totalPages: 0,
          currentPage: page,
        });
      }
    }

    // --- PRICE RANGE ---
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // --- TEXT SEARCH ---
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        // { description: { $regex: search, $options: "i" } },
      ];
    }

    // --- TOTAL COUNT ---
    const totalProduct = await Product.countDocuments(filter);

    // --- FETCH PRODUCTS ---
    const products = await Product.find(filter)
      .populate("category", "_id name")
      .populate("brand", "_id name")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // --- NO PRODUCTS ---
    if (products.length < 1) {
      return res.status(200).json({
        message: "No products found",
        products: [],
        totalProduct,
        totalPages: Math.ceil(totalProduct / limit),
        currentPage: page,
      });
    }

    // --- SUCCESS RESPONSE ---
    res.status(200).json({
      message: "Products retrieved successfully",
      products,
      pagination: {
        totalProduct,
        totalPages: Math.ceil(totalProduct / limit),
        currentPage: page,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Error: " + err.message,
    });
  }
};

// exports.create = async (req, res) => {
//   try {
//     const product = new Product(req.body);
//     await product.save();
//     res.status(201).json({
//       message: "Product create successful",
//       product,
//     });
//   } catch (err) {
//     res.status(500).json({
//       message: "Error: " + err.message,
//     });
//   }
// };
exports.create = async (req, res) => {
  try {
    const body = req.body || {};

    const name = body.name;
    const price = Number(body.price);
    const discount = Number(body.discount || 0);
    const unit = body.unit;
    const sku = body.sku;
    const category = body.category || null;
    const brand = body.brand || null;
    const description = body.description || "";
    const stock = Number(body.stock) || 0;
    const tags = body.tags;

    // Validate required fields
    if (!name || price == null || !unit || !sku) {
      return res.status(400).json({
        message: "name, price, unit, and sku are required",
      });
    }

    if (isNaN(price)) {
      return res.status(400).json({ message: "Invalid price format" });
    }

    let tagArray = [];
    if (tags) {
      if (Array.isArray(tags)) tagArray = tags;
      else if (typeof tags === "string")
        tagArray = tags.split(",").map((t) => t.trim());
    }
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map((file) => file.path);
    }

    // Create product
    const product = new Product({
      name,
      price,
      discount,
      unit,
      sku,
      category,
      brand,
      description,
      stock,
      tags: tagArray,
      image: imageUrls,
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: "Product create successful",
      product,
    });
  } catch (err) {
    console.error("ERROR:", err);
    console.error("ERROR DETAILS:", JSON.stringify(err, null, 2));
    res.status(500).json({
      success: false,
      message: "Error: " + err.message,
    });
  }
};

exports.createMAIN = async (req, res) => {
  try {
    const body = req.body || {};
    const name = body.name;
    const price = body.price;
    const unit = body.unit;
    const sku = body.sku;
    const category = body.category || null;
    const brand = body.brand || null;
    const description = body.description || "";
    const stock = body.stock || 0;
    const tags = body.tags;

    if (!name || !price || !unit || !sku) {
      return res
        .status(400)
        .json({ message: "name, price, unit, and sku are required" });
    }

    // Parse tags
    let tagArray = [];
    if (tags) {
      if (Array.isArray(tags)) tagArray = tags;
      else if (typeof tags === "string")
        tagArray = tags.split(",").map((t) => t.trim());
    }

    // Handle images
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "products",
        });
        imageUrls.push(result.secure_url);
      }
    } else if (body.image) {
      imageUrls = Array.isArray(body.image) ? body.image : [body.image];
    }

    const product = new Product({
      name,
      price,
      unit,
      sku,
      category,
      brand,
      description,
      stock,
      tags: tagArray,
      image: imageUrls,
    });
    console.log("API HIT");

    await product.save();

    res.status(201).json({
      message: "Product create successful",
      product,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error: " + err.message });
  }
};

exports.creates = async (req, res) => {
  try {
    // Extract uploaded images from Cloudinary
    // const { name, price, unit, sku, tags } = req.body;
    const images = req.files?.map((file) => file.path) || [];

    const product = new Product({
      ...req.body,
      // tags:
      //   typeof req.body.tags === "string"
      //     ? req.body.tags.split(",")
      //     : req.body.tags,
      image: images,
    });

    await product.save();

    res.status(201).json({
      message: "Product create successful",
      product,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error: " + err.message,
    });
  }
};
// exports.update = async (req, res) => {
//   try {
//     const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//     });
//     if (!product) {
//       return res.status(404).json({
//         message: "Product not found",
//       });
//     }
//     res.status(200).json({
//       message: "Product update successful",
//       product,
//     });
//   } catch (err) {
//     res.status(500).json({
//       message: "Error: " + err.message,
//     });
//   }
// };
exports.updateNew = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // If new images uploaded → delete old images from Cloudinary
    if (req.files && req.files.length > 0) {
      if (product.image && product.image.length > 0) {
        for (let imgUrl of product.image) {
          const publicId = imgUrl.split("/").slice(-2).join("/").split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        }
      }

      product.image = req.files.map((file) => file.path);
    }

    // Update other fields
    product.name = req.body.name || product.name;
    product.category = req.body.category || product.category;
    product.brand = req.body.brand || product.brand;
    product.description = req.body.description || product.description;
    product.price = req.body.price || product.price;
    product.stock = req.body.stock || product.stock;
    product.unit = req.body.unit || product.unit;
    product.sku = req.body.sku || product.sku;
    product.tags =
      typeof req.body.tags === "string"
        ? req.body.tags.split(",")
        : req.body.tags || product.tags;

    await product.save();

    // ✅ Populate category and brand before sending response
    const populatedProduct = await Product.findById(product._id)
      .populate("category", "_id name")
      .populate("brand", "_id name");

    res.status(200).json({
      message: "Product update successful",
      product: populatedProduct,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error: " + err.message,
    });
  }
};
exports.updatess = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);

    if (typeof req.body === "undefined") {
      req.body = {};
    }

    let product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Handle image deletion and new uploads
    if (req.files && req.files.length > 0) {
      if (product.image && product.image.length > 0) {
        for (let imgUrl of product.image) {
          const publicId = imgUrl.split("/").slice(-2).join("/").split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        }
      }
      req.body.image = req.files.map((file) => file.path);
    }

    // Handle tags
    if (req.body.tags && typeof req.body.tags === "string") {
      req.body.tags = req.body.tags.split(",").map((tag) => tag.trim());
    }

    // Convert numeric strings to numbers
    if (req.body.price) req.body.price = Number(req.body.price);
    if (req.body.stock) req.body.stock = Number(req.body.stock);

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true, // Return the updated document
        runValidators: true, // Run schema validators
      }
    );

    console.log("Updated product:", updatedProduct);

    res.status(200).json({
      success: true,
      message: "Product update successful",
      product: updatedProduct,
    });
  } catch (err) {
    console.error("Full error:", err);
    res.status(500).json({
      success: false,
      message: "Error: " + err.message,
    });
  }
};
exports.update = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // If new images uploaded → delete old images from Cloudinary
    if (req.files && req.files.length > 0) {
      if (product.image && product.image.length > 0) {
        for (let imgUrl of product.image) {
          // Extract Cloudinary public ID
          const publicId = imgUrl.split("/").slice(-2).join("/").split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        }
      }

      // Set new Cloudinary images
      product.image = req.files.map((file) => file.path);
    }

    // Update other fields
    // product.name = req.body.name || product.name;
    // product.category = req.body.category || product.category;
    // product.brand = req.body.brand || product.brand;
    // product.description = req.body.description || product.description;
    // product.price = req.body.price || product.price;
    // product.stock = req.body.stock || product.stock;
    // product.unit = req.body.unit || product.unit;
    // product.sku = req.body.sku || product.sku;
    const body = req.body || {};

    product.name = body.name || product.name;
    product.category = body.category || product.category;
    product.brand = body.brand || product.brand;
    product.description = body.description || product.description;
    product.price = body.price || product.price;
    product.discount = body.discount || product.discount;
    product.stock = body.stock || product.stock;
    product.unit = body.unit || product.unit;
    product.sku = body.sku || product.sku;
    product.tags =
      typeof body.tags === "string"
        ? body.tags.split(",")
        : body.tags || product.tags;
    await product.save();

    res.status(200).json({
      success: true,
      message: "Product update successful",
      product,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error: " + err.message,
    });
  }
};
// exports.delete = async (req, res) => {
//   try {
//     await Product.findByIdAndDelete(req.params.id).then((product) => {
//       if (!product) {
//         return res.status(404).json({
//           message: "Product not found",
//         });
//       }
//       res.status(200).json({
//         message: `Product ${product.name} delete successful`,
//       });
//     });
//   } catch (err) {
//     res.status(500).json({
//       message: "Error: " + err.message,
//     });
//   }
// };

exports.delete = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    console.log(product.image);

    // Delete Cloudinary images
    if (product.image && product.image.length > 0) {
      for (let imgUrl of product.image) {
        const publicId = imgUrl.split("/").slice(-2).join("/").split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: `Product ${product.name} delete successful`,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error: " + err.message,
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Product retrieve successful",
      product,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error: " + err.message,
    });
  }
};
