"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "@/app/libs/toast";
import { TbPhotoPlus } from "react-icons/tb";

export type UploadFolder = "profiles" | "registrations" | "listings" | "chat";

interface ImageUploadProps {
  onChange: (value: string) => void;
  value: string;
  triggerUpload?: boolean;
  folder?: UploadFolder;
  previewAlt?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onChange,
  value,
  triggerUpload = false,
  folder = "listings",
  previewAlt,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const openedAutomatically = useRef(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (triggerUpload && !openedAutomatically.current) {
      openedAutomatically.current = true;
      inputRef.current?.click();
    }
  }, [triggerUpload]);

  const upload = useCallback(async (file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Choose an image no larger than 10 MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("folder", folder);
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Upload failed");
      onChange(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [folder, onChange]);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="relative flex min-h-44 w-full cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-sm border-2 border-dashed border-hairline p-8 text-muted transition hover:border-ink disabled:cursor-wait disabled:opacity-70"
      >
        <TbPhotoPlus size={24} aria-hidden="true" />
        <span className="font-semibold text-ink">{uploading ? "Uploading…" : value ? "Replace image" : "Choose an image"}</span>
        <span className="text-xs">JPG, PNG or WebP · up to 10 MB</span>
        {value && (
          <span className="absolute inset-0">
            <Image alt={previewAlt || `Uploaded ${folder === "registrations" ? "vehicle registration document" : folder === "profiles" ? "profile photo" : "vehicle photo"} preview`} fill sizes="(max-width: 768px) 100vw, 520px" className="object-cover" src={value} />
            <span className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2 text-sm font-medium text-white">{uploading ? "Uploading…" : "Click to replace"}</span>
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm" role="status" aria-live="polite">
            <span className="relative flex h-14 w-14 items-center justify-center">
              <span className="loader-orbit absolute inset-0 rounded-full border-2 border-hairline border-t-primary" aria-hidden="true" />
              <TbPhotoPlus size={21} className="text-primary" aria-hidden="true" />
            </span>
            <span className="mt-4 font-semibold text-ink">Uploading image</span>
            <span className="mt-1 text-xs text-muted">Please keep this window open</span>
          </span>
        )}
      </button>
    </div>
  );
};

export default ImageUpload;
