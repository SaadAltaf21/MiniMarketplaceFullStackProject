import express from "express";
import mongoose from "mongoose";
import UserModel from "./models/userSchema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import productModel from "./models/productSchema.js";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const PORT = 5000;
const app = express();

const JWT_SECRET = process.env.JWT_SECRET;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const URI = process.env.URI;

if (!JWT_SECRET || !URI) {
  throw new Error("JWT_SECRET and URI must be configured in .env");
}

mongoose
  .connect(URI)
  .then(() => console.log("MONGOBD CONNECT!"))
  .catch((error) => console.log(error.message));

const authMiddleware = (request, response, next) => {
  try {
    const authHeader = request.headers["authorization"]; // Header se token read karein
    const token = authHeader && authHeader.split(" ")[1]; // 'Bearer TOKEN' se token nikala

    if (!token) {
      return response.status(401).json({
        message: "Access Denied. No Token Provided!",
        status: false,
      });
    }

    // Token Verification
    const decoded = jwt.verify(token, JWT_SECRET);
    request.user = decoded; // User payload request ke sath attach kar diya
    next(); // Protected route par janay do
  } catch (error) {
    return response.status(403).json({
      message: "Invalid or Expired Token",
      status: false,
    });
  }
};

app.post("/productCreate", authMiddleware, async (request, response) => {
  try {
    const { title, description, price, category, condition, location, image } = request.body;
    const productData = {
      title, description, price, category, condition, location, image,
      seller: request.user.userId,
    };

    const createProduct = await productModel.create(productData);
    console.log(createProduct);
    response.json({
      message: "PRODUCT CREATED!",
      data: createProduct,
    });
  } catch (error) {
    console.log(error.message);
    response.json({
      message: error.message || "Something Went Wrong",
      data: null,
    });
  }
});

app.get("/getProduct", async (request, response) => {
  try {
    const getProduct = await productModel
      .find()
      .populate("seller", "-password");
    // const getProduct = await productModel.find();
    console.log(getProduct);
    response.json({
      message: "GET PRODUCT",
      data: getProduct,
    });
  } catch (error) {
    response.json({
      message: error.message || "Something Went Wrong",
      data: null,
    });
  }
});

app.put("/updateProduct/:id", authMiddleware, async (request, response) => {
  try {
    const productId = request.params.id;
    if (!mongoose.isValidObjectId(productId)) {
      return response.status(400).json({ message: "Invalid product ID", data: null });
    }
    const allowedFields = ["title", "description", "price", "category", "condition", "location", "image"];
    const body = Object.fromEntries(
      allowedFields
        .filter((field) => request.body[field] !== undefined)
        .map((field) => [field, request.body[field]]),
    );
    if (Object.keys(body).length === 0) {
      return response.status(400).json({ message: "No valid fields to update", data: null });
    }
    const updateProduct = await productModel.findByIdAndUpdate(
      { _id: productId, seller: request.user.userId },
      { $set: body },
      {
        new: true,
        runValidators: true,
      },
    );
    if (!updateProduct) {
      return response.status(404).json({ message: "Product not found or access denied", data: null });
    }
    response.json({
      message: "UPDATE Product",
      data: updateProduct,
    });
  } catch (error) {
    response.json({
      message: error.message || "Something Went Wrong",
      data: null,
    });
  }
});

app.delete("/deleteProduct/:id", authMiddleware, async (request, response) => {
  try {
    const productId = request.params.id;
    if (!mongoose.isValidObjectId(productId)) {
      return response.status(400).json({ message: "Invalid product ID", data: null });
    }
    const deleteProduct = await productModel.findOneAndDelete({
      _id: productId,
      seller: request.user.userId,
    });
    if (!deleteProduct) {
      return response.status(404).json({ message: "Product not found or access denied", data: null });
    }
    response.json({
      message: "DELETE PRODUCT",
      data: deleteProduct,
    });
  } catch (error) {
    response.json({
      message: error.message || "Something Went Wrong",
      data: null,
    });
  }
});

app.listen(PORT, () =>
  console.log(`Server Running on http://localhost:${PORT}`),
);
