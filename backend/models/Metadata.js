import mongoose from "mongoose";

const metadataSchema = new mongoose.Schema({
  userId: { type: String, required: true },

  ccNumber: String,
  ccName: String,
  loginValue: String,
  name: String,
  age: String,
  gender: String,
  country: String,
  region: String
});

export default mongoose.model("Metadata", metadataSchema);