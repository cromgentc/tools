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