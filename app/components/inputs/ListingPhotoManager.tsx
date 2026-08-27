"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import toast from "@/app/libs/toast";
import { IconPhotoPlus, IconStar, IconX } from "@tabler/icons-react";

interface ListingPhotoManagerProps {
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

const MAX_PHOTOS = 10;

const ListingPhotoManager: React.FC<ListingPhotoManagerProps> = ({ images, onChange, disabled = false, onUploadingChange }) => {
  const inputId = useId();
  const mainInputRef = useRef<HTMLInputElement>(null);
  const secondaryInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"main" | "secondary" | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  useEffect(() => {
    onUploadingChange?.(Boolean(uploading));
    return () => onUploadingChange?.(false);
  }, [onUploadingChange, uploading]);

  const uploadFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than 10 MB`);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("folder", "listings");
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await response.json() as { url?: string; error?: string };
    if (!response.ok || !data.url) throw new Error(data.error || `Could not upload ${file.name}`);
    return data.url;
  };

  const uploadMain = async (file?: File) => {
    if (!file || disabled || uploading) return;
    setUploading("main");
    setProgress({ completed: 0, total: 1 });
    try {
      const url = await uploadFile(file);
      onChange(images.length ? [url, ...images.slice(1)] : [url]);
      setProgress({ completed: 1, total: 1 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Main photo upload failed");
    } finally {
      setUploading(null);
      if (mainInputRef.current) mainInputRef.current.value = "";
    }
  };

  const uploadSecondary = async (files?: FileList | null) => {
    if (!files?.length || disabled || uploading) return;
    if (!images[0]) {
      toast.error("Upload the main photo first");
      return;
    }
    const slots = MAX_PHOTOS - images.length;
    const selected = Array.from(files).slice(0, slots);
    if (!selected.length) {
      toast.error("You already have nine secondary photos");
      return;
    }
    if (files.length > slots) toast(`Only ${slots} more photo${slots === 1 ? "" : "s"} can be added`);

    setUploading("secondary");
    setProgress({ completed: 0, total: selected.length });
    const uploaded: string[] = [];
    for (const file of selected) {
      try {
        uploaded.push(await uploadFile(file));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Could not upload ${file.name}`);
      } finally {
        setProgress((current) => ({ ...current, completed: current.completed + 1 }));
      }
    }
    if (uploaded.length) onChange([...images, ...uploaded].slice(0, MAX_PHOTOS));
    setUploading(null);
    if (secondaryInputRef.current) secondaryInputRef.current.value = "";
  };

  const removePhoto = (index: number) => onChange(images.filter((_, imageIndex) => imageIndex !== index));
  const makeMain = (index: number) => onChange([images[index], ...images.filter((_, imageIndex) => imageIndex !== index)]);
  const percent = Math.round((progress.completed / Math.max(progress.total, 1)) * 100);
  const secondaryCount = Math.max(0, images.length - 1);

  return (
    <div className="space-y-6">
      <section aria-labelledby={`${inputId}-main`}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 id={`${inputId}-main`} className="font-semibold text-ink">Main photo</h3>
            <p className="mt-1 text-sm leading-5 text-muted">This is the cover shown in search results. Use a clear landscape photo.</p>
          </div>
          <span className="shrink-0 rounded-full bg-surface-strong px-2.5 py-1 text-xs font-semibold text-primary">Required</span>
        </div>
        <input ref={mainInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void uploadMain(event.target.files?.[0])} />
        <button
          type="button"
          disabled={disabled || Boolean(uploading)}
          onClick={() => mainInputRef.current?.click()}
          className="relative flex aspect-[16/10] min-h-48 w-full items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-hairline bg-surface-soft/40 text-center transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait sm:min-h-64"
        >
          {images[0] ? <Image src={images[0]} alt="Main listing photo" fill sizes="(max-width: 768px) 100vw, 720px" className="object-cover" /> : (
            <span className="flex flex-col items-center gap-2 px-5 text-muted"><IconPhotoPlus size={30} /><span className="font-semibold text-ink">Upload main photo</span><span className="text-xs">JPG, PNG or WebP · up to 10 MB</span></span>
          )}
          {images[0] && !uploading && <span className="absolute inset-x-0 bottom-0 bg-black/65 px-4 py-3 text-sm font-semibold text-white">Tap to replace main photo</span>}
          {uploading === "main" && <UploadOverlay label="Uploading main photo" percent={percent} />}
        </button>
      </section>

      <section aria-labelledby={`${inputId}-secondary`}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 id={`${inputId}-secondary`} className="font-semibold text-ink">Secondary photos</h3>
            <p className="mt-1 text-sm leading-5 text-muted">Add exterior, interior and feature details. You can choose a new main photo anytime.</p>
          </div>
          <span className="shrink-0 text-sm font-medium text-muted">{secondaryCount}/9</span>
        </div>

        {secondaryCount > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.slice(1).map((src, offset) => {
              const index = offset + 1;
              return (
                <div key={`${src}-${index}`} className="group overflow-hidden rounded-md border border-hairline-soft bg-white">
                  <div className="relative aspect-square"><Image src={src} alt={`Secondary listing photo ${index + 1}`} fill sizes="(max-width: 640px) 50vw, 220px" className="object-cover" /></div>
                  <div className="grid grid-cols-[1fr_44px] border-t border-hairline-soft">
                    <button type="button" onClick={() => makeMain(index)} className="flex min-h-11 items-center justify-center gap-1.5 px-2 text-xs font-semibold text-ink hover:bg-surface-soft"><IconStar size={15} />Make main</button>
                    <button type="button" onClick={() => removePhoto(index)} aria-label={`Remove secondary photo ${index}`} className="flex min-h-11 items-center justify-center border-l border-hairline-soft text-error hover:bg-red-50"><IconX size={18} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <input ref={secondaryInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void uploadSecondary(event.target.files)} />
        {secondaryCount < 9 && (
          <button
            type="button"
            disabled={disabled || Boolean(uploading) || !images[0]}
            onClick={() => secondaryInputRef.current?.click()}
            className="relative flex min-h-28 w-full items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-hairline px-4 text-center transition hover:border-primary disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-muted"
          >
            {uploading === "secondary" ? <UploadOverlay label={`Uploading ${progress.completed} of ${progress.total}`} percent={percent} /> : <span className="flex items-center gap-2 font-semibold"><IconPhotoPlus size={22} />{images[0] ? `Add up to ${9 - secondaryCount} secondary photo${9 - secondaryCount === 1 ? "" : "s"}` : "Add the main photo first"}</span>}
          </button>
        )}
      </section>

      {images[0] && (
        <button type="button" onClick={() => removePhoto(0)} className="min-h-11 text-sm font-semibold text-error underline underline-offset-4">Remove main photo</button>
      )}
    </div>
  );
};

const UploadOverlay = ({ label, percent }: { label: string; percent: number }) => (
  <span className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/92 px-5 backdrop-blur-sm" role="status" aria-live="polite">
    <span className="relative flex h-14 w-14 items-center justify-center"><span className="loader-orbit absolute inset-0 rounded-full border-2 border-hairline border-t-primary" /><span className="text-xs font-bold text-ink">{percent}%</span></span>
    <span className="mt-3 font-semibold text-ink">{label}</span>
    <span className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-hairline-soft"><span className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} /></span>
  </span>
);

export default ListingPhotoManager;
