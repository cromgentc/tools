import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegPath);

export const convertAudio = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const inputFile = req.file.path;

    // ===== SAFE FORMAT =====
    let format = "mp3";

    if (req.body.format) {
      if (Array.isArray(req.body.format)) {
        format = req.body.format[0];
      } else {
        format = req.body.format;
      }
    }

    format = String(format).toLowerCase();

    const outputName = `${Date.now()}.${format}`;
    const outputFile = path.join("uploads", outputName);

    // ===== 🔥 CRITICAL FIX =====
    ffmpeg(inputFile)
      .inputOptions("-f webm") // 👈 MUST (your files are webm)
      .audioCodec("libmp3lame") // 👈 ensures mp3 works
      .toFormat(format)

      .on("start", (cmd) => {
        console.log("FFMPEG START:", cmd);
      })

      .on("end", () => {
        console.log("✅ Conversion done");

        const baseUrl =
          process.env.BACKEND_URL ||
          `${req.protocol}://${req.get("host")}`;

        res.json({
          success: true,
          url: `${baseUrl}/uploads/${outputName}`,
        });

        fs.unlink(inputFile, () => {});
      })

      .on("error", (err) => {
        console.log("❌ FFMPEG ERROR:", err.message);

        fs.unlink(inputFile, () => {});

        res.status(500).json({
          success: false,
          message: err.message, // 👈 अब real error आएगा
        });
      })

      .save(outputFile);

  } catch (err) {
    console.log("SERVER ERROR:", err.message);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// import ffmpeg from "fluent-ffmpeg";
// import fs from "fs";
// import path from "path";

// ffmpeg.setFfmpegPath("C:\\ffmpeg\\bin\\ffmpeg.exe");

// export const convertAudio = (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded" });
//     }

//     const inputFile = req.file.path;
//     const format = (req.body.format || "mp3").toLowerCase();

//     const outputFile = `uploads/${Date.now()}.${format}`;

//     ffmpeg(inputFile)
//       .toFormat(format)
//       .on("end", () => {
//         res.download(outputFile, () => {
//           fs.unlink(inputFile, () => {});
//           fs.unlink(outputFile, () => {});
//         });
//       })
//       .on("error", (err) => {
//         console.log(err.message);
//         fs.unlink(inputFile, () => {});
//         return res.status(500).json({ error: "Conversion failed" });
//       })
//       .save(outputFile);

//   } catch (err) {
//     return res.status(500).json({ error: err.message });
//   }
// };


