import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";
import { Prisma } from "@prisma/client";
import { getAdminUser } from "@/app/libs/adminAuth";

async function GETHandler(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserEnhanced(request);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    // The bell polls only to keep its badge honest. Answering that with the
    // single count it needs avoids listing every notification and running the
    // two extra queries on by far the busiest route in the app.
    const countOnly = searchParams.get("countOnly") === "true";
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);

    const whereClause: Prisma.NotificationWhereInput = {
      userId: currentUser.id,
    };

    if (unreadOnly) {
      whereClause.read = false;
    }

    const now = new Date();
    whereClause.OR = [
      { expiresAt: null },
      { expiresAt: { isSet: false } },
      { expiresAt: { gte: now } }
    ];

    if (countOnly) {
      const unreadCount = await prisma.notification.count({
        where: {
          userId: currentUser.id,
          read: false,
          OR: [{ expiresAt: null }, { expiresAt: { isSet: false } }, { expiresAt: { gte: now } }],
        },
      });
      return NextResponse.json(
        { notifications: [], totalCount: 0, unreadCount, hasMore: false, countOnly: true },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where: whereClause, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({ where: { userId: currentUser.id, read: false, OR: [{ expiresAt: null }, { expiresAt: { isSet: false } }, { expiresAt: { gte: now } }] } }),
    ]);

    return NextResponse.json({
      notifications,
      totalCount,
      unreadCount,
      hasMore: totalCount > offset + limit
    }, { headers: { "Cache-Control": "private, no-store" } });

  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function POSTHandler(request: NextRequest) {
  try {
    const currentUser = await getAdminUser();
    if (!currentUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { 
      userId, 
      type, 
      title, 
      message, 
      data, 
      actionUrl, 
      expiresAt 
    } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data || {},
        actionUrl,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json(notification, { status: 201 });

  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = monitorApiRoute("/api/notifications", GETHandler, "GET");

export const POST = monitorApiRoute("/api/notifications", POSTHandler, "POST");
