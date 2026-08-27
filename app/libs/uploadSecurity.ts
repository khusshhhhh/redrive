import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
  "image/gif",
  "image/bmp",
  "image/x-ms-bmp",
  "image/tiff",
  "image/tif",
  "image/x-tiff",
]);

const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "webp", "avif", "heic", "heif", "gif", "bmp", "tif", "tiff",
]);
const EXTENSION_IMAGE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
};
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
  if (file.type && !ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
    throw new UploadValidationError("Use a common image format such as JPG, PNG, WebP, HEIC, AVIF, GIF, BMP, or TIFF", 415);
  }

  if ("name" in file && typeof file.name === "string") {
    const parts = file.name.toLowerCase().split(".").filter(Boolean);
    const extension = parts.at(-1) || "";

    if (parts.some((part) => FORBIDDEN_EXTENSIONS.has(part))) {
      throw new UploadValidationError("This file type is not allowed", 415);
    }
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new UploadValidationError("Use a JPG, PNG, WebP, HEIC, AVIF, GIF, BMP, or TIFF file", 415);
    }
  }
}

export function hasValidImageSignature(buffer: Buffer, type: string) {
  const normalizedType = type.toLowerCase();
  if (normalizedType === "image/jpeg" || normalizedType === "image/jpg") {
    return buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;
  }
  if (normalizedType === "image/png") {
    return buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
  }
  if (normalizedType === "image/webp") {
    return buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP";
  }
  if (normalizedType === "image/gif") {
    const signature = buffer.toString("ascii", 0, 6);
    return signature === "GIF87a" || signature === "GIF89a";
  }
  if (normalizedType === "image/bmp" || normalizedType === "image/x-ms-bmp") {
    return buffer.length >= 2 && buffer.toString("ascii", 0, 2) === "BM";
  }
  if (normalizedType === "image/tiff") {
    return buffer.length >= 4 && (
      buffer.subarray(0, 4).equals(Buffer.from([0x49, 0x49, 0x2a, 0x00])) ||
      buffer.subarray(0, 4).equals(Buffer.from([0x4d, 0x4d, 0x00, 0x2a]))
    );
  }
  if (["image/avif", "image/heic", "image/heif"].includes(normalizedType)) {
    if (buffer.length < 12 || buffer.toString("ascii", 4, 8) !== "ftyp") return false;
    const brands = buffer.toString("ascii", 8, Math.min(buffer.length, 40));
    const compatibleBrands = normalizedType === "image/avif"
      ? ["avif", "avis"]
      : ["heic", "heix", "hevc", "hevx", "mif1", "msf1"];
    return compatibleBrands.some((brand) => brands.includes(brand));
  }
  return false;
}

export function imageTypeForUpload(file: File | Blob) {
  const providedType = file.type.toLowerCase();
  if (providedType === "image/jpg") return "image/jpeg";
  if (providedType === "image/x-ms-bmp") return "image/bmp";
  if (providedType === "image/tif" || providedType === "image/x-tiff") return "image/tiff";
  if (providedType) return providedType;
  if ("name" in file && typeof file.name === "string") {
    const extension = file.name.toLowerCase().split(".").pop() || "";
    return EXTENSION_IMAGE_TYPES[extension] || "";
  }
  return "";
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
