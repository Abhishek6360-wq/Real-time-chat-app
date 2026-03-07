import cloudinary from "../config/cloudconfig.js";
import fs from "fs";

const uploadToCloudinary = async (filePath, folder) => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: "auto"
  });

  // delete local file after upload
  fs.unlinkSync(filePath);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    uploadedAt: new Date()
  };
};

export { uploadToCloudinary };
