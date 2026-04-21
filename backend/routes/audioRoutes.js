// import express from "express";
// import multer from "multer";
// import { convertAudio } from "../controllers/audioController.js";
// import fs from "fs";
// import path from "path";

// const router = express.Router();

// // ================= MULTER =================
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const dir = "uploads";
//     if (!fs.existsSync(dir)) {
//       fs.mkdirSync(dir);
//     }
//     cb(null, dir);
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   },
// });

// const upload = multer({ storage });

// // ================= ROUTE =================
// router.post("/convert", upload.single("file"), convertAudio);

// export default router;


import express from "express";
import multer from "multer";
import { convertAudio } from "../controllers/audioController.js";
import fs from "fs";
import path from "path";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.post("/convert", upload.single("file"), convertAudio);

export default router;