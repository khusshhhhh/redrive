import Constants from "expo-constants";

function configuredOrigin() {
  const fromConfig = Constants.expoConfig?.extra?.apiOrigin;
  return typeof fromConfig === "string" && fromConfig.trim()
    ? fromConfig.trim()
    : process.env.EXPO_PUBLIC_API_ORIGIN?.trim();
}

export function apiOrigin() {
  const value = configuredOrigin();
  if (!value) throw new Error("EXPO_PUBLIC_API_ORIGIN is not configured");
  const url = new URL(value);
  const localHost = ["localhost", "127.0.0.1", "10.0.2.2"].includes(url.hostname) || /^192\.168\.|^10\./.test(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) {
    throw new Error("EXPO_PUBLIC_API_ORIGIN must use HTTPS outside local development");
  }
  return url.origin;
}

export function mobileApiUrl(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("API paths must be root-relative");
  return new URL(`/api/mobile/v1${path}`, `${apiOrigin()}/`).toString();
}
