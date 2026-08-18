import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";

// PATCH - Bulk mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserEnhanced(request);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, action } = body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: "Invalid notification IDs" },
        { status: 400 }
      );
    }

    if (action === "markAllRead") {
      // Mark all notifications as read for the user
      await prisma.notification.updateMany({
        where: {
          userId: currentUser.id,
          read: false,
        },
        data: {
          read: true,
        },
      });

      return NextResponse.json({ message: "All notifications marked as read" });
    }

    if (action === "markRead") {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: currentUser.id,
        },
        data: {
          read: true,
        },
      });

      return NextResponse.json({ message: "Notifications marked as read" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Error in bulk notification operation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete notifications
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserEnhanced(request);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, action } = body;

    if (action === "deleteAll") {
      // Delete all notifications for the user
      await prisma.notification.deleteMany({
        where: {
          userId: currentUser.id,
        },
      });

      return NextResponse.json({ message: "All notifications deleted" });
    }

    if (action === "deleteRead") {
      // Delete all read notifications for the user
      await prisma.notification.deleteMany({
        where: {
          userId: currentUser.id,
          read: true,
        },
      });

      return NextResponse.json({ message: "Read notifications deleted" });
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: "Invalid notification IDs" },
        { status: 400 }
      );
    }

    // Delete specific notifications
    await prisma.notification.deleteMany({
      where: {
        id: { in: notificationIds },
        userId: currentUser.id,
      },
    });

    return NextResponse.json({ message: "Notifications deleted" });

  } catch (error) {
    console.error("Error in bulk notification deletion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
