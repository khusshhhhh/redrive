// Toasts dismiss themselves, so a message must stay on screen long enough to be
// read without the close button. Reading pace for a short, glanced notification
// is roughly 180 words per minute, and a word is about 5.5 characters, which
// lands near 60ms per character once the eye has found the toast.
const RECOGNITION_MS = 1_500;
const MS_PER_CHARACTER = 60;
export const MIN_TOAST_MS = 3_000;
export const MAX_TOAST_MS = 11_000;

export function readingDurationMs(text: string) {
  const characters = text.trim().length;
  if (!characters) return MIN_TOAST_MS;
  const estimate = RECOGNITION_MS + (characters * MS_PER_CHARACTER);
  return Math.min(MAX_TOAST_MS, Math.max(MIN_TOAST_MS, Math.round(estimate)));
}

type NodeLike = { props?: { children?: unknown } };

// Messages are usually plain strings, but a caller may pass an element. Walking
// its children keeps the timing honest instead of falling back to a fixed guess.
export function toastTextContent(message: unknown, depth = 0): string {
  if (typeof message === "string") return message;
  if (typeof message === "number") return String(message);
  if (depth >= 6 || message === null || typeof message !== "object") return "";
  if (Array.isArray(message)) {
    return message.map((child) => toastTextContent(child, depth + 1)).join(" ");
  }
  const children = (message as NodeLike).props?.children;
  return children === undefined ? "" : toastTextContent(children, depth + 1);
}
