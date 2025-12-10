const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// DEBUG: Check if env vars are loaded
console.log("--- Cloudinary Config Debug ---");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME || "MISSING");
console.log("API Key:", process.env.CLOUDINARY_API_KEY || "MISSING");
console.log("API Secret Length:", process.env.CLOUDINARY_API_SECRET ? process.env.CLOUDINARY_API_SECRET.length : "MISSING");
console.log("-------------------------------");

// Only use manual config if individual variables are set
if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
} else {
    console.log("Using CLOUDINARY_URL from environment (if present).");
}

const storage = multer.memoryStorage(); // Use memory storage to get the buffer

const upload = multer({ storage: storage });

module.exports = { upload, cloudinary };
