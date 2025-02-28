import { NextResponse } from "next/server";
import cloudinary from "cloudinary";

// ✅ Configure Cloudinary (No `.v2` needed)
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const { image } = await request.json();
    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // ✅ Upload Image to Cloudinary (No `.v2` needed)
    const uploadedImage = await cloudinary.v2.uploader.upload(image, {
      folder: "listings",
    });

    return NextResponse.json(
      { url: uploadedImage.secure_url },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Cloudinary Upload Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
