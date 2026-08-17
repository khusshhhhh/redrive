export function hasSubmittedLicense(value?: string | null) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.pathname.includes("/image/upload/") &&
      url.pathname.includes("/redrive/licenses/");
  } catch {
    return false;
  }
}
