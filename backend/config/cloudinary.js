import { v2 as cloudinary } from "cloudinary";
import {
  getCloudinarySettings,
  getCloudinarySettingsFromDb,
} from "../utils/adminSettings.js";

export const configureCloudinary = () => {
  const settings = getCloudinarySettings();

  cloudinary.config({
    cloud_name: settings.cloudName,
    api_key: settings.apiKey,
    api_secret: settings.apiSecret,
  });

  return settings;
};

export const configureCloudinaryFromDb = async () => {
  const settings = await getCloudinarySettingsFromDb();

  cloudinary.config({
    cloud_name: settings.cloudName,
    api_key: settings.apiKey,
    api_secret: settings.apiSecret,
  });

  return settings;
};

configureCloudinary();

export default cloudinary;

// import cloudinary from "cloudinary";

// cloudinary.v2.config({
//   cloud_name: process.env.CLOUD_NAME,
//   api_key: process.env.API_KEY,
//   api_secret: process.env.API_SECRET,
// });

// export default cloudinary;
