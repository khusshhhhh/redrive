import { pushTokenRequestSchema } from "@redrive/contracts/mobile";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { mobileJson, mobileUnexpectedError, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";

async function POSTHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseMobileJson(request, pushTokenRequestSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const token = await prisma.mobilePushToken.upsert({ where: { token: parsed.data.token }, create: { userId: auth.identity.userId, ...parsed.data }, update: { userId: auth.identity.userId, ...parsed.data, lastSeenAt: new Date(), disabledAt: null, invalidAt: null } });
    await prisma.mobilePushToken.updateMany({ where: { userId: auth.identity.userId, deviceId: parsed.data.deviceId, appEnvironment: parsed.data.appEnvironment, id: { not: token.id }, disabledAt: null }, data: { disabledAt: new Date() } });
    return mobileJson(request, { id: token.id, registered: true }, 201);
  } catch (error) {
    return mobileUnexpectedError(request, error, "Mobile push token registration failed");
  }
}

async function DELETEHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseMobileJson(request, pushTokenRequestSchema.pick({ token: true, deviceId: true, platform: true, appEnvironment: true }));
  if (!parsed.ok) return parsed.response;
  const result = await prisma.mobilePushToken.updateMany({ where: { userId: auth.identity.userId, token: parsed.data.token }, data: { disabledAt: new Date() } });
  return mobileJson(request, { disabled: result.count });
}

export const POST = monitorApiRoute("/api/mobile/v1/devices/push-tokens", POSTHandler, "POST");
export const DELETE = monitorApiRoute("/api/mobile/v1/devices/push-tokens", DELETEHandler, "DELETE");
