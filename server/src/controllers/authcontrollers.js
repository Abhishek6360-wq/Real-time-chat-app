import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import validator from 'validator'
import usermodel from '../models/usermodel.js'
import mongoose from 'mongoose'


// api to register a user
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.json({
        success: false,
        message: "All fields are required"
      });
    }

    if (!validator.isEmail(email)) {
      return res.json({
        success: false,
        message: "Invalid email"
      });
    }

    const existingUser = await usermodel.findOne({ email });

    if (existingUser) {
      return res.json({
        success: false,
        message: "User already exists, please login"
      });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[\x21-\x7E]{8,16}$/;

    if (!passwordRegex.test(password)) {
      return res.json({
        success: false,
        message:
          "Password must be 8–16 chars and include uppercase, lowercase, number, and special character"
      });
    }

    const salt = await bcrypt.genSalt(
      Number(process.env.BCRYPT_SALT_ROUNDS)
    );
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await usermodel.create({
      username,
      email,
      password: hashedPassword,
      avatar: {
        url: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
        publicId: "default_sample"
      }
    });

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role
      },
      process.env.JWT_SECRET
    );

    return res.json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar
        }
      },
      message: "User registered successfully"
    });

  } catch (error) {
    console.error(error);
    return res.json({
      success: false,
      message: error.message
    });
  }
};


// api for user login 
const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({
        success: false, message: "Email and password are required"
      });
    }

    const user = await usermodel.findOne({ email }).select("+password");

    if (!user) {
      return res.json({
        success: false,
        message: "User not registered"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const accessToken = jwt.sign(
      {
        userId: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
    );

    return res.json({
      success: true,
      data: {
        accessToken,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar
        }
      },
      message: "Login successful"
    });
  } catch (error) {
    console.error(error);
    return res.json({
      success: false,
      message: error.message
    });
  }
};

// api for user logout
const userLogout = async (req, res) => {
  try {
    return res.json({
      success: true,
      message: "Logout successful"
    });
  } catch (error) {
    console.error(error);
    return res.json({
      success: false,
      message: error.message
    });
  }
};

export { register, userLogin, userLogout };
