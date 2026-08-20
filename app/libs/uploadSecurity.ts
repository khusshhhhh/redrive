import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const FORBIDDEN_EXTENSIONS = new Set([
  "php",
  "php3",
  "php4",
  "php5",
  "phtml",
  "phar",
  "asp",
  "aspx",
  "cgi",
  "exe",
  "dll",
  "bat",
  "cmd",
  "com",
  "js",
  "mjs",
  "html",
  "htm",
  "svg",
  "xml",
  "sh",
  "ps1",
  "jar",
]);

export class UploadValidationError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export function validateImageUploadMetadata(file: File | Blob) {
  if (file.size === 0) {
    throw new UploadValidationError("Choose an image to upload", 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError("Image must be 10 MB or smaller", 413);
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new UploadValidationError("Use a JPG, PNG, or WebP image", 415);
  }

  if ("name" in file && typeof file.name === "string") {
    const parts = file.name.toLowerCase().split(".").filter(Boolean);
    const extension = parts.at(-1) || "";

    if (parts.some((part) => FORBIDDEN_EXTENSIONS.has(part))) {
      throw new UploadValidationError("This file type is not allowed", 415);
    }
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new UploadValidationError("The filename must end in .jpg, .jpeg, .png, or .webp", 415);
    }
  }
}

export function hasValidImageSignature(buffer: Buffer, type: string) {
  if (type === "image/jpeg") {
    return buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;
  }
  if (type === "image/png") {
    return buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
  }
  return buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP";
}

/**
 * Fully decodes and re-encodes an image before storage. This rejects corrupt
 * images/pixel bombs and removes metadata or trailing executable content.
 */
export async function sanitizeImage(buffer: Buffer, type: string) {
  if (!hasValidImageSignature(buffer, type)) {
    throw new UploadValidationError("The selected file is not a valid image", 415);
  }

  try {
    const pipeline = sharp(buffer, {
      animated: false,
      failOn: "error",
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true });

    if (type === "image/png") {
      return await pipeline.png({ compressionLevel: 9 }).toBuffer();
    }
    if (type === "image/webp") {
      return await pipeline.webp({ quality: 90 }).toBuffer();
    }
    return await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  } catch (error) {
    if (error instanceof UploadValidationError) throw error;
    throw new UploadValidationError("The selected file could not be safely decoded", 415);
  }
}

export async function createOcrImage(buffer: Buffer) {
  try {
    return await sharp(buffer, {
      animated: false,
      failOn: "error",
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new UploadValidationError("The selected file could not be prepared for text recognition", 415);
  }
}
