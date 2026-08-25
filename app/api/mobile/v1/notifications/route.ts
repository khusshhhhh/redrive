import { z } from "zod";
import { objectIdSchema, paginationQuerySchema } from "@redrive/contracts/mobile";
import type { Notification, Prisma } from "@prisma/client";

import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { mobileIdentityOrResponse } from "@/app/libs/mobile-auth/route-utils";
import { mobileJson, mobileUnexpectedError, mobileValidationError, parseMobileJson } from "@/app/libs/mobile-api/responses";
import prisma from "@/app/libs/prismadb";

const serialize = (notification: Notification) => ({ id: notification.id, type: notification.type, title: notification.title, message: notification.message, data: notification.data, read: notification.read, createdAt: notification.createdAt.toISOString(), expiresAt: notification.expiresAt?.toISOString() || null });

async function GETHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const parsed = paginationQuerySchema.safeParse(Object.fromEntries([...url.searchParams.entries()].filter(([key]) => key !== "unread")));
  if (!parsed.success) return mobileValidationError(request, parsed.error);
  const unreadOnly = url.searchParams.get("unread") === "true";
  try {
    const now = new Date();
    const where = { userId: auth.identity.userId, ...(unreadOnly ? { read: false } : {}), OR: [{ expiresAt: null }, { expiresAt: { isSet: false } }, { expiresAt: { gte: now } }] } satisfies Prisma.NotificationWhereInput;
    const [rows, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: parsed.data.limit + 1, ...(parsed.data.cursor ? { cursor: { id: parsed.data.cursor }, skip: 1 } : {}) }),
      prisma.notification.count({ where: { userId: auth.identity.userId, read: false, OR: [{ expiresAt: null }, { expiresAt: { isSet: false } }, { expiresAt: { gte: now } }] } }),
    ]);
    const hasMore = rows.length > parsed.data.limit;
    const pageRows = hasMore ? rows.slice(0, parsed.data.limit) : rows;
    return mobileJson(request, { data: pageRows.map(serialize), unreadCount, page: { hasMore, nextCursor: hasMore ? pageRows.at(-1)?.id || null : null } });
  } catch (error) {
    return mobileUnexpectedError(request, error, "Mobile notifications failed");
  }
}

async function PATCHHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseMobileJson(request, z.object({ action: z.enum(["markRead", "markAllRead"]), notificationIds: z.array(objectIdSchema).max(100).default([]) }));
  if (!parsed.ok) return parsed.response;
  const result = await prisma.notification.updateMany({ where: { userId: auth.identity.userId, read: false, ...(parsed.data.action === "markRead" ? { id: { in: parsed.data.notificationIds } } : {}) }, data: { read: true } });
  return mobileJson(request, { updated: result.count });
}

async function DELETEHandler(request: Request) {
  const auth = await mobileIdentityOrResponse(request);
  if (!auth.ok) return auth.response;
  const parsed = await parseMobileJson(request, z.object({ action: z.enum(["delete", "deleteRead", "deleteAll"]), notificationIds: z.array(objectIdSchema).max(100).default([]) }));
  if (!parsed.ok) return parsed.response;
  const result = await prisma.notification.deleteMany({ where: { userId: auth.identity.userId, ...(parsed.data.action === "delete" ? { id: { in: parsed.data.notificationIds } } : {}), ...(parsed.data.action === "deleteRead" ? { read: true } : {}) } });
  return mobileJson(request, { deleted: result.count });
}

export const GET = monitorApiRoute("/api/mobile/v1/notifications", GETHandler, "GET");
export const PATCH = monitorApiRoute("/api/mobile/v1/notifications", PATCHHandler, "PATCH");
export const DELETE = monitorApiRoute("/api/mobile/v1/notifications", DELETEHandler, "DELETE");
