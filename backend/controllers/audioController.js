import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegPath);

export const convertAudio = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const inputFile = req.file.path;
    const format = (req.body.format || "mp3").toLowerCase();

    const outputName = `${Date.now()}.${format}`;
    const outputFile = path.join("uploads", outputName);

    // 🔥 Dynamic base URL (IMPORTANT FIX)
    const baseUrl =
      process.env.BACKEND_URL ||
      `${req.protocol}://${req.get("host")}`;

    ffmpeg(inputFile)
      .toFormat(format)
      .on("end", () => {
        const fileUrl = `${baseUrl}/uploads/${outputName}`;

        // delete input file
        fs.unlink(inputFile, () => {});

        res.json({
          success: true,
          url: fileUrl,
        });
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


