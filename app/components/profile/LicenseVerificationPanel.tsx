"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileImage, LoaderCircle, ScanLine } from "lucide-react";
import toast from "react-hot-toast";

import { AU_ISSUERS, type ExtractedLicenseFields } from "@/app/libs/licenseDocument";
import type { SafeUser } from "@/app/types";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "image/heic",
  "image/heif", "image/gif", "image/bmp", "image/x-ms-bmp", "image/tiff",
  "image/tif", "image/x-tiff",
]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif", "heic", "heif", "gif", "bmp", "tif", "tiff"]);
const ACCEPTED_IMAGES = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,image/gif,image/bmp,image/tiff,.jpg,.jpeg,.png,.webp,.avif,.heic,.heif,.gif,.bmp,.tif,.tiff";

type SafeResult = {
  licenseStatus: string;
  licenseExpiryDate: string | null;
  licenseIssuerState: string | null;
  licenseHolderName: string | null;
  licenseNumberLast4: string | null;
  licenseCardLast4: string | null;
  licenseNameMatches: boolean | null;
  licenseDobMatches: boolean | null;
  licenseVerifiedAt: string | null;
  licenseRejectionReason: string | null;
};

function validateFile(file: File) {
  const extension = file.name.toLowerCase().split(".").pop() || "";
  if ((file.type && !ALLOWED_TYPES.has(file.type.toLowerCase())) || !ALLOWED_EXTENSIONS.has(extension)) {
    return "Use a JPG, PNG, WebP, HEIC, AVIF, GIF, BMP or TIFF image";
  }
  if (file.size > MAX_BYTES) return "Each image must be 10 MB or smaller";
  return "";
}

function FilePicker({
  id,
  label,
  file,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled: boolean;
}) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    setPreviewFailed(false);
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return (
    <label htmlFor={id} className={`group relative flex min-h-40 flex-col items-center justify-center overflow-hidden rounded-sm border-2 border-dashed text-center transition ${file ? "border-hairline bg-surface-soft" : "p-5"} ${disabled ? "cursor-wait opacity-60" : "cursor-pointer hover:border-ink"}`}>
      {previewUrl && !previewFailed ? (
        // A plain img is intentional here: local blob URLs are not compatible
        // with the Next image optimiser and never leave the user's browser.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt={`${label} preview`} className="absolute inset-0 h-full w-full object-cover" onError={() => setPreviewFailed(true)} />
      ) : (
        <div className="flex flex-col items-center justify-center px-5">
          <FileImage size={23} className="text-primary" />
          <span className="mt-2 text-sm font-semibold text-ink">{label}</span>
          <span className="mt-1 text-xs text-muted">Common image formats · maximum 10 MB</span>
        </div>
      )}
      {file && (
        <span className="absolute inset-x-2 bottom-2 z-10 rounded-xs bg-ink/85 px-2.5 py-1.5 text-left text-xs font-medium text-white shadow-card backdrop-blur-sm">
          <span className="block font-semibold">{label}</span>
          <span className="block truncate text-white/80">{file.name}</span>
        </span>
      )}
      <input
        id={id}
        type="file"
        accept={ACCEPTED_IMAGES}
        capture="environment"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.files?.[0] || null;
          if (next) {
            const error = validateFile(next);
            if (error) {
              toast.error(error);
              event.target.value = "";
              return;
            }
          }
          onChange(next);
        }}
      />
    </label>
  );
}

function statusTone(status: string) {
  if (status === "VERIFIED") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "EXPIRED" || status === "DETAILS_MISMATCH" || status === "REJECTED") return "border-red-200 bg-red-50 text-red-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

export default function LicenseVerificationPanel({ user }: { user: SafeUser }) {
  const router = useRouter();
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [fields, setFields] = useState<ExtractedLicenseFields | null>(null);
  const [confidence, setConfidence] = useState<number | null>(user.licenseClassificationConfidence ?? null);
  const [busy, setBusy] = useState<"ANALYSING" | "SAVING" | null>(null);
  const [result, setResult] = useState<SafeResult>({
    licenseStatus: user.licenseStatus || "NOT_SUBMITTED",
    licenseExpiryDate: user.licenseExpiryDate || null,
    licenseIssuerState: user.licenseIssuerState || null,
    licenseHolderName: user.licenseHolderName || null,
    licenseNumberLast4: user.licenseNumberLast4 || null,
    licenseCardLast4: user.licenseCardLast4 || null,
    licenseNameMatches: user.licenseNameMatches ?? null,
    licenseDobMatches: user.licenseDobMatches ?? null,
    licenseVerifiedAt: user.licenseVerifiedAt || null,
    licenseRejectionReason: user.licenseRejectionReason || null,
  });

  const statusMessage = useMemo(() => {
    if (result.licenseStatus === "VERIFIED") return "The document appears to be a current Australian driver licence and its name and date of birth match your Redrive profile.";
    if (result.licenseStatus === "DETAILS_MISMATCH") return result.licenseRejectionReason || "The licence details do not match your Redrive profile.";
    if (result.licenseStatus === "EXPIRED") return result.licenseRejectionReason || "This licence has expired.";
    if (result.licenseStatus === "NEEDS_CONFIRMATION") return "Review the extracted details below before completing the check.";
    return "Upload clear photos of the front and back to check the document.";
  }, [result]);

  const analyse = async () => {
    if (!front || !back) {
      toast.error("Choose both the front and back images");
      return;
    }
    setBusy("ANALYSING");
    try {
      const form = new FormData();
      form.append("front", front);
      form.append("back", back);
      const response = await fetch("/api/license-verification", { method: "POST", body: form });
      const data = await response.json() as { error?: string; fields?: ExtractedLicenseFields; confidence?: number; status?: string };
      if (!response.ok || !data.fields) throw new Error(data.error || "Licence analysis failed");
      setFields(data.fields);
      setConfidence(data.confidence ?? null);
      setResult((current) => ({ ...current, licenseStatus: data.status || "NEEDS_CONFIRMATION", licenseRejectionReason: null }));
      toast.success("Licence recognised. Check the extracted details.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Licence analysis failed");
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    if (!fields) return;
    setBusy("SAVING");
    try {
      const response = await fetch("/api/license-verification", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await response.json() as SafeResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "Licence details could not be saved");
      setResult(data);
      setFields(null);
      setFront(null);
      setBack(null);
      toast.success(data.licenseStatus === "VERIFIED" ? "Licence details checked" : "Licence check completed");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Licence details could not be saved");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className={`flex gap-3 rounded-sm border p-4 text-sm leading-6 ${statusTone(result.licenseStatus)}`}>
        {result.licenseStatus === "VERIFIED" ? <CheckCircle2 size={19} className="mt-0.5 shrink-0" /> : <AlertTriangle size={19} className="mt-0.5 shrink-0" />}
        <div>
          <p className="font-semibold">{result.licenseStatus === "VERIFIED" ? "Licence details checked" : "Booking remains locked"}</p>
          <p>{statusMessage}</p>
        </div>
      </div>

      {result.licenseHolderName && !fields && (
        <dl className="grid gap-3 rounded-sm border border-hairline-soft bg-surface-soft p-4 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted">Name on licence</dt><dd className="mt-1 font-semibold text-ink">{result.licenseHolderName}</dd></div>
          <div><dt className="text-xs text-muted">Issuer / expiry</dt><dd className="mt-1 font-semibold text-ink">{result.licenseIssuerState} · {result.licenseExpiryDate}</dd></div>
          <div><dt className="text-xs text-muted">Licence number</dt><dd className="mt-1 font-semibold text-ink">•••• {result.licenseNumberLast4}</dd></div>
          <div><dt className="text-xs text-muted">Card number</dt><dd className="mt-1 font-semibold text-ink">•••• {result.licenseCardLast4}</dd></div>
        </dl>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <FilePicker id="licence-front" label="Front of licence" file={front} onChange={setFront} disabled={Boolean(busy)} />
        <FilePicker id="licence-back" label="Back of licence" file={back} onChange={setBack} disabled={Boolean(busy)} />
      </div>

      <button
        type="button"
        onClick={() => void analyse()}
        disabled={!front || !back || Boolean(busy)}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-ink px-5 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy === "ANALYSING" ? <LoaderCircle size={17} className="animate-spin" /> : <ScanLine size={17} />}
        {busy === "ANALYSING" ? "Reading licence…" : result.licenseStatus === "VERIFIED" ? "Check replacement licence" : "Read licence"}
      </button>

      {fields && (
        <div className="space-y-4 rounded-sm border border-hairline p-4 sm:p-5">
          <div>
            <h3 className="text-sm font-semibold text-ink">Confirm the text shown on the card</h3>
            <p className="mt-1 text-xs leading-5 text-muted">OCR confidence: {confidence === null ? "unknown" : `${Math.round(confidence * 100)}%`}. If any value is wrong, retake clearer photos instead of confirming it.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-ink">Given name(s)<input value={fields.givenNames} readOnly className="mt-1 h-11 w-full rounded-sm border border-hairline bg-surface-soft px-3 text-sm font-normal" /></label>
            <label className="text-xs font-semibold text-ink">Family name<input value={fields.familyName} readOnly className="mt-1 h-11 w-full rounded-sm border border-hairline bg-surface-soft px-3 text-sm font-normal" /></label>
            <label className="text-xs font-semibold text-ink">Date of birth<input type="date" value={fields.dateOfBirth} readOnly className="mt-1 h-11 w-full rounded-sm border border-hairline bg-surface-soft px-3 text-sm font-normal" /></label>
            <label className="text-xs font-semibold text-ink">Expiry date<input type="date" value={fields.expiryDate} readOnly className="mt-1 h-11 w-full rounded-sm border border-hairline bg-surface-soft px-3 text-sm font-normal" /></label>
            <label className="text-xs font-semibold text-ink">Licence / client number<input value={fields.licenseNumber} readOnly autoComplete="off" className="mt-1 h-11 w-full rounded-sm border border-hairline bg-surface-soft px-3 text-sm font-normal uppercase" /></label>
            <label className="text-xs font-semibold text-ink">Card number<input value={fields.cardNumber} readOnly autoComplete="off" className="mt-1 h-11 w-full rounded-sm border border-hairline bg-surface-soft px-3 text-sm font-normal uppercase" /></label>
            <label className="text-xs font-semibold text-ink sm:col-span-2">Issuing state or territory<select value={fields.issuerState} disabled className="mt-1 h-11 w-full rounded-sm border border-hairline bg-surface-soft px-3 text-sm font-normal"><option value="">Not detected</option>{AU_ISSUERS.map((state) => <option key={state}>{state}</option>)}</select></label>
          </div>
          <button type="button" onClick={() => void confirm()} disabled={Boolean(busy)} className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-primary px-5 text-sm font-semibold text-white disabled:opacity-50">
            {busy === "SAVING" && <LoaderCircle size={17} className="animate-spin" />}
            {busy === "SAVING" ? "Checking profile…" : "Confirm and check profile"}
          </button>
        </div>
      )}

      <p className="text-xs leading-5 text-muted">This automated check reads the document, checks its format and expiry, and compares its name and date of birth with your Redrive profile. It does not query a government issuer or confirm suspension, licence class, authenticity, or that the uploader is the cardholder.</p>
    </div>
  );
}
