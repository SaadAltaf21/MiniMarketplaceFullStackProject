import express from "express";
import mongoose from "mongoose";
import UserModel from "./models/userSchema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import productModel from "./models/productSchema.js";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();

const PORT = 3000;
const app = express();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || !process.env.URI) {
  throw new Error("JWT_SECRET and URI must be configured in .env");
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ************** MongoDB Connection *****************

const URI = process.env.URI;

mongoose
  .connect(URI)
  .then(() => console.log("MONGOBD CONNECT!"))
  .catch((error) => console.log(error.message));

// ********************     NodeMailer ***********************

const emailConfig = {
  service: "gmail",
  auth: {
    user: process.env.PORTAL_EMAIL,
    pass: process.env.PORTAL_PASSWORD,
  },
};

const sendEmailOTP = async (email) => {
  const transporter = nodemailer.createTransport(emailConfig);

  const otp = crypto.randomInt(100000, 1000000);

  const mailOptions = {
    from: process.env.PORTAL_EMAIL,
    to: email,
    subject: "OTP VERIFICATION MINI Marketplace",
    text: `Your OTP is: ${otp}`,
  };

  await transporter.sendMail(mailOptions);

  return otp;
};

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

// // ********** Sign UP API ***********
app.post("/signUp", async (request, response) => {
  try {
    const { fullName, email, password, confirmPassword } = request.body;
    if (!fullName || !email || !password || !confirmPassword) {
      return response.status(400).json({ message: "All fields are required", status: false });
    }
    if (password !== confirmPassword) {
      return response.status(400).json({ message: "Passwords do not match", status: false });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const findUser = await UserModel.findOne({ email: normalizedEmail });
    if (findUser) {
      return response.json({
        message: "Email Address Already Exist",
        date: null,
        status: false,
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const obj = {
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashPassword,
    };

    const createUser = await UserModel.create(obj);

    response.json({
      message: "User SignUp Successfully",
      data: { id: createUser._id, fullName: createUser.fullName, email: createUser.email },
      status: true,
    });
  } catch (error) {
    response.json({
      message: error.message || "Something Went Wrong",
      status: false,
    });
  }
});

// // *********** Login API **********
app.post("/login", async (request, response) => {
  try {
    const { email, password } = request.body;
    const user = await UserModel.findOne({ email: email?.trim().toLowerCase() });
    if (!user) {
      return response.json({
        message: "Email or Password invalid",
        status: false,
      });
    }

    const comparePass = await bcrypt.compare(password, user.password);
    if (!comparePass) {
      return response.json({
        message: "Email or Password invalid",
        status: false,
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }, // 1 Din tak valid rahega
    );

    return response.json({
      message: "User Login Successfully",
      status: true,
      token: token, // Token frontend ko bhej diya
      data: { id: user._id, fullName: user.fullName, email: user.email },
    });
  } catch (error) {
    response.json({
      message: error.message || "Something went wrong",
      status: false,
    });
  }
});

// *********** Logout API **********
app.post("/logout", (request, response) => {
  return response.json({
    message: "User Logged Out Successfully",
    status: true,
  });
});

app.post("/forgot-password", async (request, response) => {
  try {
    const { email } = request.body;

    const user = await UserModel.findOne({ email: email?.trim().toLowerCase() }).select("+otp +otpExpiresAt +otpRequestedAt");

    if (!user) {
      return response.json({
        message: "Email not found",
        status: false,
      });
    }

    if (user.otpRequestedAt && user.otpRequestedAt > new Date(Date.now() - 60 * 1000)) {
      return response.status(429).json({ message: "Please wait before requesting another OTP", status: false });
    }

    const otp = await sendEmailOTP(email);

    user.otp = await bcrypt.hash(String(otp), 10);
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.otpRequestedAt = new Date();
    await user.save();

    response.json({
      message: "OTP sent successfully",
      status: true,
    });
  } catch (error) {
    response.json({
      message: error.message,
      status: false,
    });
  }
});

app.post("/reset-password", async (request, response) => {
  try {
    const { email, otp, newPassword } = request.body;

    const user = await UserModel.findOne({ email: email?.trim().toLowerCase() }).select("+otp +otpExpiresAt +otpRequestedAt");

    const isValidOtp = user?.otp && await bcrypt.compare(String(otp), user.otp);
    if (!user || !isValidOtp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return response.json({
        message: "Invalid OTP",
        status: false,
      });
    }

    const hashPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashPassword;
    user.otp = null;
    user.otpExpiresAt = null;
    user.otpRequestedAt = null;

    await user.save();

    response.json({
      message: "Password reset successfully",
      status: true,
    });
  } catch (error) {
    response.json({
      message: error.message,
      status: false,
    });
  }
});

// app.get("/products", async (request, response) => {
//   response.json({
//     message: "Protected Marketplace Products Fetched Successfully",
//     status: true,
//     user: request.user,
//   });
// });

// app.get("/products", async (request, response) => {
//   try {
//     const products = await productModel.find();

//     response.json({
//       message: "Products fetched successfully",
//       status: true,
//       data: products,
//     });
//   } catch (error) {
//     response.json({
//       message: error.message,
//       status: false,
//     });
//   }
// });

// app.get("/products", async (request, response) => {
//   try {
//     const products = await productModel.find();

//     response.json({
//       message: "Products Fetched Successfully",
//       status: true,
//       data: products,
//     });
//   } catch (error) {
//     response.json({
//       message: error.message,
//       status: false,
//     });
//   }
// });

app.post("/products", authMiddleware, async (request, response) => {
  try {
    const { title, description, price, category, condition, location, image } = request.body;
    const product = await productModel.create({
      title, description, price, category, condition, location, image,
      seller: request.user.userId,
    });

    response.json({
      message: "Product Added Successfully",
      status: true,
      data: product,
    });
  } catch (error) {
    response.json({
      message: error.message,
      status: false,
    });
  }
});

app.listen(PORT, () =>
  console.log(`Server Running on http://localhost:${PORT}`),
);
