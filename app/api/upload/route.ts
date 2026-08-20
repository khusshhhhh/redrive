import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  MAX_UPLOAD_BYTES,
  UploadValidationError,
  sanitizeImage,
  validateImageUploadMetadata,
} from "@/app/libs/uploadSecurity";

export const runtime = "nodejs";

const ALLOWED_FOLDERS = new Set([
  "profiles",
  "registrations",
  "listings",
  "chat",
  "handovers",
]);

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadImage(buffer: Buffer, folder: string) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `redrive/${folder}`,
        resource_type: "image",
        type: folder === "handovers" ? "authenticated" : "upload",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation:
          folder === "profiles"
            ? [{ width: 800, height: 800, crop: "limit", quality: "auto" }]
            : [{ width: 2400, height: 2400, crop: "limit", quality: "auto" }],
      },
      (error, result) => {
        if (error || !result)
          reject(error ?? new Error("Cloudinary returned no upload result"));
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
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    if (
      !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.error("Cloudinary upload is not configured");
      return NextResponse.json(
        { error: "Image upload is not configured" },
        { status: 503 },
      );
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_UPLOAD_BYTES + 64 * 1024) {
      return NextResponse.json(
        { error: "Image must be 10 MB or smaller" },
        { status: 413 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("image");
    const requestedFolder = formData.get("folder");
    if (typeof requestedFolder !== "string" || !ALLOWED_FOLDERS.has(requestedFolder)) {
      return NextResponse.json({ error: "Invalid upload destination" }, { status: 400 });
    }
    const folder = requestedFolder;

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Choose an image to upload" },
        { status: 400 },
      );
    }
    validateImageUploadMetadata(file);

    const originalBuffer = Buffer.from(await file.arrayBuffer());
    const buffer = await sanitizeImage(originalBuffer, file.type);

    const result = await uploadImage(buffer, folder);
    const url =
      folder === "handovers"
        ? `/api/files/handover?asset=${encodeURIComponent(result.public_id)}`
        : result.secure_url;
    const previewUrl =
      folder === "handovers"
        ? cloudinary.url(result.public_id, {
            type: "authenticated",
            secure: true,
            sign_url: true,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          })
        : undefined;
    return NextResponse.json(
      { url, publicId: result.public_id, previewUrl },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Cloudinary upload failed", error);
    return NextResponse.json(
      { error: "Image upload failed. Please try again." },
      { status: 500 },
    );
  }
}
