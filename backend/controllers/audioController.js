import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveBinaryPath = (configuredPath, fallbackCommand) => {
  const normalizedPath = String(configuredPath || "").trim();

  if (!normalizedPath) {
    return fallbackCommand;
  }

  if (fs.existsSync(normalizedPath)) {
    return normalizedPath;
  }

  return fallbackCommand;
};

const resolvedFfmpegPath = resolveBinaryPath(
  process.env.FFMPEG_PATH || ffmpegPath,
  "ffmpeg"
);

ffmpeg.setFfmpegPath(resolvedFfmpegPath);

const ALLOWED_FORMATS = new Set(["mp3", "wav"]);
const UPLOADS_DIR = path.resolve(__dirname, "../uploads");

const safeUnlink = (filePath) => {
  if (!filePath) return;

  fs.unlink(filePath, () => {});
};

export const convertAudio = (req, res) => {
  try {
    if (!req.file?.path) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const requestedFormat = Array.isArray(req.body?.format)
      ? req.body.format[0]
      : req.body?.format;

    const format = String(requestedFormat || "mp3").trim().toLowerCase();

    if (!ALLOWED_FORMATS.has(format)) {
      safeUnlink(req.file.path);

      return res.status(400).json({
        success: false,
        message: "Invalid format. Only mp3 and wav are supported.",
      });
    }

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const inputFile = req.file.path;
    const outputFile = path.join(UPLOADS_DIR, `${Date.now()}.${format}`);

    const command = ffmpeg(inputFile)
      .noVideo()
      .format(format)
      .outputOptions("-y");

    if (format === "mp3") {
      command.audioCodec("libmp3lame");
    } else {
      command.audioCodec("pcm_s16le");
      command.audioFrequency(44100);
      command.audioChannels(2);
    }

    command
      .on("start", (ffmpegCommand) => {
        console.log("FFMPEG CMD:", ffmpegCommand);
        console.log("FFMPEG PATH:", resolvedFfmpegPath);
      })
      .on("end", () => {
        res.download(outputFile, `converted.${format}`, (downloadErr) => {
          if (downloadErr) {
            console.error("DOWNLOAD ERROR:", downloadErr.message);
          }

          safeUnlink(inputFile);
          safeUnlink(outputFile);
        });
      })
      .on("error", (err) => {
        console.error("FFMPEG ERROR:", err.message);

        safeUnlink(inputFile);
        safeUnlink(outputFile);

        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: err.message || "Conversion failed",
          });
        }
      })
      .save(outputFile);
  } catch (err) {
    console.error("AUDIO CONVERT ERROR:", err.message);

    safeUnlink(req.file?.path);

    return res.status(500).json({
      success: false,
      message: err.message || "Conversion failed",
    });
  }
};
