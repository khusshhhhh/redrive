import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

// GET - Fetch user's notifications
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const whereClause: any = {
      userId: currentUser.id,
    };

    if (unreadOnly) {
      whereClause.read = false;
    }

    // Remove expired notifications
    const now = new Date();
    whereClause.OR = [
      { expiresAt: null },
      { expiresAt: { gte: now } }
    ];

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc"
      },
      take: limit,
      skip: offset,
    });

    const totalCount = await prisma.notification.count({
      where: whereClause,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: currentUser.id,
        read: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: now } }
        ]
      },
    });

    return NextResponse.json({
      notifications,
      totalCount,
      unreadCount,
      hasMore: totalCount > offset + limit
    });

  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new notification (for admin/system use)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Validate required fields
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