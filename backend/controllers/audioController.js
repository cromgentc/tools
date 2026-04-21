// import ffmpeg from "fluent-ffmpeg";
// import ffmpegPath from "ffmpeg-static";
// import fs from "fs";
// import path from "path";

// ffmpeg.setFfmpegPath(ffmpegPath);

// export const convertAudio = (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "No file uploaded",
//       });
//     }

//     const inputFile = req.file.path;

//     // ===== FORMAT SAFE =====
//     let format = "mp3";

//     if (req.body.format) {
//       format = Array.isArray(req.body.format)
//         ? req.body.format[0]
//         : req.body.format;
//     }

//     format = String(format).toLowerCase();

//     const outputName = `${Date.now()}.${format}`;
//     const outputFile = path.join("uploads", outputName);

//     // ===== FFMPEG =====
//     ffmpeg(inputFile)
//       .inputOptions("-f webm") // 🔥 webm input fix
//       .toFormat(format)

//       .on("start", (cmd) => {
//         console.log("FFMPEG CMD:", cmd);
//       })

//       .on("end", () => {
//         console.log("✅ Conversion success");

//         const baseUrl =
//   process.env.BACKEND_URL ||
//   "https://recording-tools.onrender.com";

// const fileUrl = `${baseUrl}/uploads/${filename}`;

//         res.json({
//           success: true,
//           url: fileUrl,
//         });

//         fs.unlink(inputFile, () => {});
//       })

//       .on("error", (err) => {
//         console.log("❌ FFMPEG ERROR:", err.message);

//         fs.unlink(inputFile, () => {});

//         res.status(500).json({
//           success: false,
//           message: err.message,
//         });
//       })

//       .save(outputFile);

//   } catch (err) {
//     console.log("SERVER ERROR:", err.message);

//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

ffmpeg.setFfmpegPath("C:\\ffmpeg\\bin\\ffmpeg.exe");

export const convertAudio = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const inputFile = req.file.path;
    const format = (req.body.format || "mp3").toLowerCase();

    const outputFile = `uploads/${Date.now()}.${format}`;

    ffmpeg(inputFile)
      .toFormat(format)
      .on("end", () => {
        res.download(outputFile, () => {
          fs.unlink(inputFile, () => {});
          fs.unlink(outputFile, () => {});
        });
      })
      .on("error", (err) => {
        console.log(err.message);
        fs.unlink(inputFile, () => {});
        return res.status(500).json({ error: "Conversion failed" });
      })
      .save(outputFile);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


