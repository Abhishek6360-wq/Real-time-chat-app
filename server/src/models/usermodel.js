import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is necessary"],
      unique: true,
      trim: true,
      index: true
    },

    email: {
      type: String,
      required: [true, "Email is necessary"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    password: {
      type: String,
      required: [true, "Password is necessary"],
      select: false
    },

    avatar: {
      url: {
        type: String,
        required: true
      },
      publicId: {
        type: String,
        required: true
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    },

    isOnline: {
      type: Boolean,
      default: false
    },

    lastSeen: {
      type: Date
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },

    unreadNotificationCount: {
      type: Number,
      default: 0
    },

    notificationSettings: {
      pushEnabled: {
        type: Boolean,
        default: true
      },
      soundEnabled: {
        type: Boolean,
        default: true
      }
    },

    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  {
    timestamps: true
  }
);

const usermodel = mongoose.model("User", userSchema);
export default usermodel;
