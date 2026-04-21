import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegPath);

export const convertAudio = (req, res) => {
  try {
    // ================= FILE CHECK =================
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const inputFile = req.file.path;

    // ================= FORMAT FIX =================
    let rawFormat = req.body.format;

    let format;

    if (Array.isArray(rawFormat)) {
      format = rawFormat[0];
    } else if (typeof rawFormat === "string") {
      format = rawFormat;
    } else {
      format = "mp3";
    }

    const finalFormat = format.toLowerCase();

    // ================= OUTPUT =================
    const outputName = `${Date.now()}.${finalFormat}`;
    const outputFile = path.join("uploads", outputName);

    // ================= FFMPEG =================
    ffmpeg(inputFile)
      .toFormat(finalFormat)
      .on("end", () => {
        // 🔥 Dynamic base URL (no undefined issue)
        const baseUrl =
          process.env.BACKEND_URL ||
          `${req.protocol}://${req.get("host")}`;

        const fileUrl = `${baseUrl}/uploads/${outputName}`;

        res.json({
          success: true,
          url: fileUrl,
        });

        // delete input file
        fs.unlink(inputFile, () => {});
      })
      .on("error", (err) => {
        console.log("FFMPEG ERROR:", err.message);

        fs.unlink(inputFile, () => {});

        res.status(500).json({
          success: false,
          message: "Conversion failed",
        });
      })
      .save(outputFile);

  } catch (err) {
    console.error("CONTROLLER ERROR:", err.message);

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


