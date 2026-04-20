import mongoose from "mongoose";

const recordingSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },

    audioLink: {
      type: String,
      required: true,
    },

    public_id: {
      type: String,
      required: false, // Optional - not needed for local uploads
    },

    scriptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Script",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fileSize: {
      type: Number,
      default: 0,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["completed", "pending"],
      default: "completed",
    },

    // Backwards compatibility
    script: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Script",
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Recording", recordingSchema);