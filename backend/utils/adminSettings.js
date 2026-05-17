import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const settingsDir = path.join(__dirname, "..", "data");
const settingsPath = path.join(settingsDir, "adminSettings.json");

const defaultSettings = {
  cloudName: "",
  apiKey: "",
  apiSecret: "",
};

export const readAdminSettings = () => {
  try {
    if (!fs.existsSync(settingsPath)) {
      return defaultSettings;
    }

    return {
      ...defaultSettings,
      ...JSON.parse(fs.readFileSync(settingsPath, "utf8")),
    };
  } catch (err) {
    console.error("READ ADMIN SETTINGS ERROR:", err.message);
    return defaultSettings;
  }
};

export const saveAdminSettings = (settings) => {
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }

  const nextSettings = {
    ...readAdminSettings(),
    cloudName: String(settings.cloudName || "").trim(),
    apiKey: String(settings.apiKey || "").trim(),
    apiSecret: String(settings.apiSecret || "").trim(),
  };

  fs.writeFileSync(settingsPath, JSON.stringify(nextSettings, null, 2));

  return nextSettings;
};

export const getCloudinarySettings = () => {
  const savedSettings = readAdminSettings();

  return {
    cloudName: savedSettings.cloudName || process.env.CLOUD_NAME || "",
    apiKey: savedSettings.apiKey || process.env.API_KEY || "",
    apiSecret: savedSettings.apiSecret || process.env.API_SECRET || "",
  };
};
