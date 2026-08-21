import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

import prisma from "@/app/libs/prismadb";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function GETHandler(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const asset = new URL(request.url).searchParams.get("asset") || "";
  if (!asset.startsWith("redrive/handovers/") || asset.length > 300)
    return NextResponse.json({ error: "Invalid asset" }, { status: 400 });
  const viewer = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  const media = await prisma.handoverMedia.findFirst({
    where: { publicId: asset },
    select: { reportId: true },
  });
  const report = media
    ? await prisma.handoverReport.findUnique({
        where: { id: media.reportId },
        select: { reservationId: true },
      })
    : null;
  const reservation = report
    ? await prisma.reservation.findUnique({
        where: { id: report.reservationId },
        select: { userId: true, listing: { select: { userId: true } } },
      })
    : null;
  if (
    !viewer ||
    !reservation ||
    (viewer.id !== reservation.userId &&
      viewer.id !== reservation.listing.userId)
  )
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const signedUrl = cloudinary.url(asset, {
    type: "authenticated",
    secure: true,
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + 300,
  });
  return NextResponse.redirect(signedUrl, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export const GET = monitorApiRoute("/api/files/handover", GETHandler, "GET");
