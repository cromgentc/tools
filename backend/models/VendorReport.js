import mongoose from "mongoose";

const vendorReportSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    vendorName: {
      type: String,
      required: true,
    },
    vendorCode: {
      type: String,
      default: "N/A",
    },
    projectName: {
      type: String,
      default: "",
    },
    batch: {
      type: String,
      default: "",
    },
    reportUrl: {
      type: String,
      default: "",
    },
    fileName: {
      type: String,
      default: "",
    },
    fileUrl: {
      type: String,
      default: "",
    },
    sharedBy: {
      type: String,
      default: "admin",
    },
  },
  { timestamps: true }
);

export default mongoose.model("VendorReport", vendorReportSchema);
