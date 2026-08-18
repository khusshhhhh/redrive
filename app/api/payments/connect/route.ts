import { NextResponse } from "next/server";

import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import prisma from "@/app/libs/prismadb";
import { siteUrl } from "@/app/libs/siteUrl";
import { getStripe } from "@/app/libs/stripe";
import { consumeRateLimits, tooManyRequests } from "@/app/libs/security";

async function syncAccount(userId: string, accountId: string) {
  const account = await getStripe().accounts.retrieve(accountId, {
    expand: ["external_accounts"],
  });
  const detailsSubmitted = account.details_submitted;
  const payoutsEnabled =
    account.payouts_enabled && account.capabilities?.transfers === "active";
  const bankAccount = account.external_accounts?.data.find(
    (externalAccount) => externalAccount.object === "bank_account",
  );
  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeDetailsSubmitted: detailsSubmitted,
      stripePayoutsEnabled: payoutsEnabled,
    },
  });
  return {
    connected: true,
    detailsSubmitted,
    payoutsEnabled,
    bankAccount: bankAccount
      ? {
          bankName: bankAccount.bank_name,
          last4: bankAccount.last4,
        }
      : null,
  };
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUserEnhanced(request);
  if (!currentUser)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { stripeConnectedAccountId: true },
  });
  if (!user?.stripeConnectedAccountId) {
    return NextResponse.json({
      connected: false,
      detailsSubmitted: false,
      payoutsEnabled: false,
      bankAccount: null,
    });
  }
  try {
    return NextResponse.json(
      await syncAccount(currentUser.id, user.stripeConnectedAccountId),
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    console.error("Stripe account sync failed", error);
    return NextResponse.json(
      { error: "Payout status is temporarily unavailable" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUserEnhanced(request);
  if (!currentUser)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rateLimit = await consumeRateLimits([
    { scope: "stripe-connect", identifier: currentUser.id, limit: 10, windowMs: 60 * 60_000 },
  ]);
  if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);
  let action: "onboard" | "manage" = "onboard";
  try {
    const body = await request.json().catch(() => ({}));
    action = body?.action === "manage" ? "manage" : "onboard";
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { email: true, stripeConnectedAccountId: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    let accountId = user.stripeConnectedAccountId;
    if (action === "manage") {
      if (!accountId) {
        return NextResponse.json(
          { error: "Set up your payout account before managing bank details" },
          { status: 409 },
        );
      }
      const loginLink = await getStripe().accounts.createLoginLink(accountId);
      return NextResponse.json({ url: loginLink.url });
    }

    if (!accountId) {
      const account = await getStripe().accounts.create(
        {
          type: "express",
          country: "AU",
          email: user.email || undefined,
          capabilities: { transfers: { requested: true } },
          business_profile: {
            product_description: "Peer-to-peer vehicle hire through Redrive",
          },
          metadata: { redriveUserId: currentUser.id },
        },
        { idempotencyKey: `redrive-user-${currentUser.id}-connect-account` },
      );
      accountId = account.id;
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { stripeConnectedAccountId: accountId },
      });
    }

    const link = await getStripe().accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/profile?payouts=refresh#payouts`,
      return_url: `${siteUrl}/profile?payouts=returned#payouts`,
      type: "account_onboarding",
    });
    return NextResponse.json({ url: link.url });
  } catch (error) {
    console.error(`Stripe Connect ${action} flow failed`, error);
    return NextResponse.json(
      {
        error:
          action === "manage"
            ? "Bank details could not be opened"
            : "Payout setup could not be started",
      },
      { status: 503 },
    );
  }
}
