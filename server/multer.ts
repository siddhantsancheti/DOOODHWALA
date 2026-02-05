import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "demo", // Fallback for safety, but env required for prod
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Storage Engine
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Generate a unique public ID (filename)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        return {
            folder: 'doodhwala-uploads',
            format: 'jpeg', // Force format or remove to keep original
            public_id: `file-${uniqueSuffix}`,
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], // Restrict formats
        };
    },
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
});

export default upload;
