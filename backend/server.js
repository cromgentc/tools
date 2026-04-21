import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import connectDB from "./config/db.js";

// routes
import recordingRoutes from "./routes/recordingRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import scriptRoutes from "./routes/scriptRoutes.js";
import metadataRoutes from "./routes/metadataRoutes.js";
import recordRoutes from "./routes/recordRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import audioRoutes from "./routes/audioRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================
   CORS (SMART + FLEXIBLE)
========================= */
const allowedOrigins = [
  "http://localhost:5000",
  "https://recording-tools.onrender.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        origin.includes("vercel.app")
      ) {
        return callback(null, true);
      }

      console.log("❌ BLOCKED CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

/* =========================
   BODY LIMIT
========================= */
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "1000mb" }));

/* =========================
   STATIC
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("📁 Created uploads directory");
}

// serve uploads
app.use("/uploads", express.static("uploads"));

/* =========================
   ROUTES
========================= */
app.get("/", (req, res) => {
  res.json({ success: true, message: "🚀 Backend running" });
});

app.use("/api/recording", recordingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/script", scriptRoutes);
app.use("/api/metadata", metadataRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/audio", audioRoutes);

/* =========================
   ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err.message);
  res.status(500).json({
    success: false,
    message: err.message || "Server Error",
  });
});

/* =========================
   START
========================= */
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on ${PORT}`);
    });
  } catch (err) {
    console.error("DB Error:", err.message);
  }
};

startServer();