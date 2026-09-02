import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";

import prisma from "@/app/libs/prismadb";
import { siteUrl } from "@/app/libs/siteUrl";

// One-click unsubscribe target for the List-Unsubscribe header on lifecycle
// mail (Spam Act 2003 + RFC 8058). The token in the link is the only
// credential — it stops marketing/lifecycle email but never transactional
// booking, payment or safety messages.

async function unsubscribe(token: string | null): Promise<"ok" | "unknown" | "missing"> {
  if (!token || token.length < 8 || token.length > 100) return "missing";
  const user = await prisma.user.findUnique({
    where: { emailUnsubscribeToken: token },
    select: { id: true, marketingEmailConsent: true },
  });
  if (!user) return "unknown";
  if (user.marketingEmailConsent) {
    await prisma.user.update({
      where: { id: user.id },
      data: { marketingEmailConsent: false, marketingEmailConsentAt: null },
    });
  }
  return "ok";
}

function page(body: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Redrive email preferences</title><style>
      body{margin:0;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:#f4f4f4;color:#111111;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
      .card{max-width:440px;border:1px solid #e7e7e7;border-radius:18px;padding:32px}
      .bar{width:44px;height:3px;background:#eab308;border-radius:2px;margin-bottom:18px}
      h1{font-size:22px;margin:0 0 10px;letter-spacing:-0.4px}
      p{font-size:15px;line-height:24px;color:#4a4a4a;margin:0 0 8px}
      a{color:#111111}
    </style></head><body><div class="card"><div class="bar"></div>${body}<p style="margin-top:16px"><a href="${siteUrl}/profile#notifications">Manage all notification settings</a></p></div></body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

async function GETHandler(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const result = await unsubscribe(token);
  if (result === "ok") {
    return page(
      `<h1>You're unsubscribed</h1><p>You won't get Redrive tips, summaries or re-engagement emails any more.</p><p>You'll still get essential messages about your bookings, payments and account security — those can't be turned off while you have an active account.</p>`,
    );
  }
  if (result === "unknown") {
    return page(`<h1>Link not recognised</h1><p>This unsubscribe link is invalid or has already been used. Nothing was changed.</p>`);
  }
  return page(`<h1>Missing token</h1><p>This link is incomplete. Open it directly from the email.</p>`);
}

// RFC 8058 one-click POST from the mail client.
async function POSTHandler(request: Request) {
  const url = new URL(request.url);
  let token = url.searchParams.get("token");
  if (!token) {
    const body = await request.text().catch(() => "");
    token = new URLSearchParams(body).get("token");
  }
  const result = await unsubscribe(token);
  return NextResponse.json({ unsubscribed: result === "ok" }, { status: result === "ok" ? 200 : 400 });
}

export const GET = monitorApiRoute("/api/notifications/unsubscribe", GETHandler, "GET");
export const POST = monitorApiRoute("/api/notifications/unsubscribe", POSTHandler, "POST");
