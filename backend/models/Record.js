import mongoose from "mongoose";

const recordSchema = new mongoose.Schema({
  userId: String,
  script: String,
  audioLink: String,
  metadata: Object,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Record", recordSchema);