import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cloudinary from "../config/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");

const resolveLocalUploadPaths = (recording) => {
  const filePaths = new Set();

  if (recording?.filename) {
    filePaths.add(path.join(uploadsDir, path.basename(recording.filename)));
  }

  if (typeof recording?.audioLink === "string") {
    const match = recording.audioLink.trim().match(/(?:^|\/)uploads\/([^?#]+)/i);

    if (match?.[1]) {
      let fileName = match[1];

      try {
        fileName = decodeURIComponent(fileName);
      } catch {
        // Ignore malformed URLs and fall back to the raw filename.
      }

      filePaths.add(path.join(uploadsDir, path.basename(fileName)));
    }
  }

  return [...filePaths];
};

export const removeRecordingAssets = async (recording) => {
  if (!recording) return;

  if (recording.public_id) {
    const result = await cloudinary.uploader.destroy(recording.public_id, {
      resource_type: "video",
    });

    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(`Cloudinary deletion failed for ${recording.public_id}`);
    }
  }

  for (const filePath of resolveLocalUploadPaths(recording)) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};
