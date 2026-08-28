"use client";

import baseToast, {
  type Renderable,
  type Toast,
  type ToastOptions,
  type ToastPosition,
  type ValueOrFunction,
} from "react-hot-toast";

import { readingDurationMs, toastTextContent } from "@/app/libs/toastDuration";
import { enqueueToast } from "@/app/libs/toastQueue";

type Message = ValueOrFunction<Renderable, Toast>;
type Kind = "success" | "error" | "warning" | "info";

// Warnings hold longer than the plain reading time; errors stay until the user
// acknowledges them. A caller-supplied duration always wins.
function durationFor(kind: Kind, message: Message, explicit?: number): number {
  if (explicit !== undefined) return explicit;
  const reading = readingDurationMs(toastTextContent(message));
  if (kind === "error") return Infinity;
  if (kind === "warning") return Math.max(7_000, reading);
  return reading;
}

// Desktop toasts sit bottom-right, out of the working area. On mobile they drop
// from the top edge so they never cover the bottom nav or thumb zone.
function positionFor(explicit?: ToastPosition): ToastPosition {
  if (explicit) return explicit;
  if (typeof window !== "undefined" && window.matchMedia?.("(max-width: 640px)").matches) {
    return "top-center";
  }
  return "bottom-right";
}

function emit(kind: Kind, message: Message, options?: ToastOptions) {
  const opts: ToastOptions = {
    ...options,
    duration: durationFor(kind, message, options?.duration),
    position: positionFor(options?.position),
  };

  enqueueToast(() => {
    if (kind === "success") baseToast.success(message, opts);
    else if (kind === "error") baseToast.error(message, opts);
    else baseToast(message, { ...opts, className: `redrive-kind-${kind}` });
  });
}

const toast = Object.assign(
  (message: Message, options?: ToastOptions) => emit("info", message, options),
  baseToast,
  {
    success: (message: Message, options?: ToastOptions) => emit("success", message, options),
    error: (message: Message, options?: ToastOptions) => emit("error", message, options),
    warning: (message: Message, options?: ToastOptions) => emit("warning", message, options),
    info: (message: Message, options?: ToastOptions) => emit("info", message, options),
    custom: (message: Message, options?: ToastOptions) =>
      baseToast.custom(message, { position: positionFor(options?.position), ...options }),
  },
);

export { toast };
export default toast;
