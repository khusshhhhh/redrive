import { useState } from "react";

export const useCloudinaryUpload = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = async (file: File, folder: string = "listings") => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("folder", folder);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: JSON.stringify({ image: await toBase64(file), folder }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");

      setLoading(false);
      return data.url;
    } catch (err) {
      setLoading(false);
      setError(err.message);
      return null;
    }
  };

  return { uploadImage, loading, error };
};

// ✅ Convert File to Base64 for Cloudinary Upload
const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
