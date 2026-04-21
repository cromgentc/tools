import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const historySchema = new mongoose.Schema({
  scriptId: String,
  audioUrl: String,
  accuracy: Number,
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    mobile: {
      type: String,
      required: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: { type: String, required: true },

    passwordResetOtpHash: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetOtpExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    passwordResetMethod: {
      type: String,
      enum: ["email", "mobile", null],
      default: null,
      select: false,
    },

    passwordResetTarget: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetSessionHash: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetSessionExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin", "vendor"],
      default: "user",
    },

    // 🔥 SCRIPT SYSTEM
    accountStatus: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    lastActiveAt: {
      type: Date,
      default: null,
    },

    totalActiveSeconds: {
      type: Number,
      default: 0,
    },

    scripts: [
      {
        type: String,
      },
    ],

    currentIndex: {
      type: Number,
      default: 0,
    },

    // 🔥 PROGRESS TRACKING READY
    completedScripts: {
      type: Number,
      default: 0,
    },

    // 🔥 RECORDING HISTORY
    history: [historySchema],
  },
  { timestamps: true }
);

/* ======================
   PASSWORD HASH
====================== */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/* ======================
   PASSWORD CHECK
====================== */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
