import mongoose from "mongoose";

const adminSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    cloudName: {
      type: String,
      default: "",
    },
    apiKey: {
      type: String,
      default: "",
    },
    apiSecret: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("AdminSetting", adminSettingSchema);
