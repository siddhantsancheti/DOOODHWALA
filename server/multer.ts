import multer from "multer";
import { Storage } from "@google-cloud/storage";
import path from "path";

// Initialize GCS
// Assumes GOOGLE_APPLICATION_CREDENTIALS is set or implicit auth works
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME || "doodhwala-uploads";
const bucket = storage.bucket(bucketName);

// Custom Multer Storage Engine for GCS
class GCSStorageEngine implements multer.StorageEngine {
    _handleFile(req: any, file: Express.Multer.File, cb: (error?: any, info?: Partial<Express.Multer.File>) => void): void {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + path.extname(file.originalname);
        const blob = bucket.file(filename);

        const blobStream = blob.createWriteStream({
            resumable: false,
            gzip: true, // Optional: compress files
            public: true, // Make file public? Or signed URLs? 
            // Requirement says "return the public URL". 
            // Assuming public bucket or ACL. If not public, we need Signed URLs which expire.
            // For profile images, public read is usually desired.
            metadata: {
                contentType: file.mimetype,
            },
        });

        blobStream.on('error', (err) => {
            cb(err);
        });

        blobStream.on('finish', () => {
            const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;

            cb(null, {
                path: publicUrl, // Set path to the URL so controllers can use it easily
                filename: filename,
                size: (blobStream as any).bytesWritten || 0 // Approximate
            });
        });

        file.stream.pipe(blobStream);
    }

    _removeFile(req: any, file: Express.Multer.File, cb: (error: Error | null) => void): void {
        const filename = file.filename;
        const blob = bucket.file(filename);
        blob.delete().then(() => cb(null)).catch((err) => cb(err));
    }
}

const upload = multer({
    storage: new GCSStorageEngine(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
});

export default upload;
