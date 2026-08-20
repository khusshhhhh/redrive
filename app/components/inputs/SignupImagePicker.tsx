"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Camera, FileBadge2, X } from "lucide-react";
import toast from "react-hot-toast";

interface SignupImagePickerProps {
  label: string;
  description: string;
  value: File | null;
  onChange: (file: File | null) => void;
  variant?: "avatar" | "document";
}

const SignupImagePicker: React.FC<SignupImagePickerProps> = ({
  label,
  description,
  value,
  onChange,
  variant = "document",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!value) {
      setPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(value);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [value]);

  const chooseFile = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Use a JPG, PNG or WebP image");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Choose an image no larger than 10 MB");
      return;
    }
    onChange(file);
  };

  return (
    <div className="rounded-sm border border-hairline-soft bg-white p-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => chooseFile(event.target.files?.[0])}
      />
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-dashed border-hairline bg-surface-soft text-primary transition hover:border-primary ${variant === "avatar" ? "h-20 w-20 rounded-full" : "h-20 w-24 rounded-sm"}`}
          aria-label={`Choose ${label.toLowerCase()}`}
        >
          {preview ? <Image src={preview} alt="Selected preview" fill unoptimized className="object-cover" /> : variant === "avatar" ? <Camera size={23} /> : <FileBadge2 size={24} />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{value ? value.name : description}</p>
          <button type="button" onClick={() => inputRef.current?.click()} className="mt-2 text-xs font-semibold text-primary hover:underline">{value ? "Replace image" : "Choose image"}</button>
        </div>
        {value && <button type="button" onClick={() => onChange(null)} aria-label={`Remove ${label.toLowerCase()}`} className="rounded-full p-2 text-muted hover:bg-surface-soft hover:text-ink"><X size={16} /></button>}
      </div>
    </div>
  );
};

export default SignupImagePicker;
