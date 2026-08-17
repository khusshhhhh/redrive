import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

import { authOptions } from "@/pages/api/auth/[...nextauth]";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_FOLDERS = new Set(["profiles", "licenses", "registrations", "listings", "chat"]);

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function hasValidImageSignature(buffer: Buffer, type: string) {
  if (type === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (type === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
}

function uploadImage(buffer: Buffer, folder: string) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `redrive/${folder}`,
        resource_type: "image",
        type: folder === "licenses" ? "authenticated" : "upload",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: folder === "profiles"
          ? [{ width: 800, height: 800, crop: "limit", quality: "auto" }]
          : [{ width: 2400, height: 2400, crop: "limit", quality: "auto" }],
      },
      (error, result) => {
        if (error || !result) reject(error ?? new Error("Cloudinary returned no upload result"));
        else resolve(result);
      },
    );
    stream.end(buffer);
  });
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error("Cloudinary upload is not configured");
      return NextResponse.json({ error: "Image upload is not configured" }, { status: 503 });
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_UPLOAD_BYTES + 64 * 1024) {
      return NextResponse.json({ error: "Image must be 5 MB or smaller" }, { status: 413 });
    }

    const formData = await request.formData();
    const file = formData.get("image");
    const requestedFolder = formData.get("folder");
    const folder = typeof requestedFolder === "string" && ALLOWED_FOLDERS.has(requestedFolder)
      ? requestedFolder
      : "listings";

    if (!(file instanceof Blob) || file.size === 0) {
      return NextResponse.json({ error: "Choose an image to upload" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image must be 5 MB or smaller" }, { status: 413 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Use a JPG, PNG, or WebP image" }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidImageSignature(buffer, file.type)) {
      return NextResponse.json({ error: "The selected file is not a valid image" }, { status: 415 });
    }

    const result = await uploadImage(buffer, folder);
    const url = folder === "licenses"
      ? `/api/files/license?asset=${encodeURIComponent(result.public_id)}`
      : result.secure_url;
    return NextResponse.json({ url, publicId: result.public_id }, { status: 201 });
  } catch (error) {
    console.error("Cloudinary upload failed", error);
    return NextResponse.json({ error: "Image upload failed. Please try again." }, { status: 500 });
  }
}
