import { buildAndroidAssociation } from "@/app/libs/mobileAssociations";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const body = buildAndroidAssociation({ androidPackage: process.env.MOBILE_ANDROID_PACKAGE, androidFingerprints: process.env.MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS });
    return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
  } catch {
    return Response.json({ error: "Mobile association is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
