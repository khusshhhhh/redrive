"use client";

import baseToast, {
  type Renderable,
  type Toast,
  type ToastOptions,
  type ValueOrFunction,
} from "react-hot-toast";

import { readingDurationMs, toastTextContent } from "@/app/libs/toastDuration";

type Message = ValueOrFunction<Renderable, Toast>;

// react-hot-toast resolves a toast's lifetime when it is created, so the length
// of the message has to be measured here rather than in the renderer. A caller
// that sets its own duration always wins.
function timed(message: Message, options?: ToastOptions): ToastOptions {
  if (options?.duration !== undefined) return options;
  return { ...options, duration: readingDurationMs(toastTextContent(message)) };
}

const toast = Object.assign(
  (message: Message, options?: ToastOptions) => baseToast(message, timed(message, options)),
  baseToast,
  {
    success: (message: Message, options?: ToastOptions) => baseToast.success(message, timed(message, options)),
    error: (message: Message, options?: ToastOptions) => baseToast.error(message, timed(message, options)),
    custom: (message: Message, options?: ToastOptions) => baseToast.custom(message, timed(message, options)),
  },
);

export { toast };
export default toast;
