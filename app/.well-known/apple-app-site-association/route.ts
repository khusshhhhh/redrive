import { buildAppleAssociation } from "@/app/libs/mobileAssociations";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const body = buildAppleAssociation({ appleTeamId: process.env.MOBILE_APPLE_TEAM_ID, iosBundleId: process.env.MOBILE_IOS_BUNDLE_ID });
    return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
  } catch {
    return Response.json({ error: "Mobile association is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
