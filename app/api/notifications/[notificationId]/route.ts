import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getCurrentUserEnhanced } from "@/app/libs/auth-middleware";

interface IParams {
  notificationId: string;
}

async function PATCHHandler(
  request: NextRequest,
  { params }: { params: Promise<IParams> }
) {
  try {
    const currentUser = await getCurrentUserEnhanced(request);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationId } = await params;
    const body = await request.json();
    const { read } = body;

    // Verify the notification belongs to the current user
    const existingNotification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existingNotification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    if (existingNotification.userId !== currentUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: read !== undefined ? read : true },
    });

    return NextResponse.json(updatedNotification);

  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<IParams> }
) {
  try {
    const currentUser = await getCurrentUserEnhanced(request);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationId } = await params;

    // Verify the notification belongs to the current user
    const existingNotification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existingNotification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    if (existingNotification.userId !== currentUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return NextResponse.json({ message: "Notification deleted successfully" });

  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const PATCH = monitorApiRoute("/api/notifications/[notificationId]", PATCHHandler, "PATCH");

export const DELETE = monitorApiRoute("/api/notifications/[notificationId]", DELETEHandler, "DELETE");
