// import ffmpeg from "fluent-ffmpeg";
// import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath);

export const convertAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const inputPath = req.file.path;
    const outputPath = `uploads/converted-${Date.now()}.mp3`;

    ffmpeg(inputPath)
      .toFormat("mp3")
      .on("end", () => {
        res.json({
          success: true,
          url: `${process.env.BACKEND_URL}/uploads/${outputPath.split("/").pop()}`
        });
      })
      .on("error", (err) => {
        console.error("FFMPEG ERROR:", err);
        res.status(500).json({ message: "Conversion failed" });
      })
      .save(outputPath);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

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