import { MobileAuthConfigurationError } from "@/app/libs/mobile-auth/config";
import { IdentityRequiredError, requireMobileIdentity } from "@/app/libs/mobile-auth/identity";
import { MobileSessionError } from "@/app/libs/mobile-auth/sessions";
import { mobileError } from "@/app/libs/mobile-api/responses";

export async function mobileIdentityOrResponse(request: Request) {
  try {
    return { ok: true as const, identity: await requireMobileIdentity(request) };
  } catch {
    return { ok: false as const, response: mobileError(request, 401, "UNAUTHENTICATED", "Sign in to continue.") };
  }
}

export function mobileAuthErrorResponse(request: Request, error: unknown) {
  if (error instanceof MobileAuthConfigurationError) {
    console.error("Mobile authentication configuration error", error.message);
    return mobileError(request, 503, "MOBILE_AUTH_UNAVAILABLE", "Mobile sign-in is temporarily unavailable.");
  }
  if (error instanceof MobileSessionError) {
    return mobileError(request, 401, error.code, error.message);
  }
  if (error instanceof IdentityRequiredError) {
    return mobileError(request, 401, "UNAUTHENTICATED", "Sign in to continue.");
  }
  return null;
}
