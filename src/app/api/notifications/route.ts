import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { Notification } from "@/lib/db/models/Notification";

export const dynamic = "force-dynamic";

// GET /api/notifications - List user's notifications
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const notifications = await Notification.find({ userId: user.userId })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      userId: user.userId,
      read: false,
    });

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const body = await req.json();
    const { notificationIds, markAllAsRead } = body;

    await connectToDatabase();

    if (markAllAsRead) {
      await Notification.updateMany({ userId: user.userId, read: false }, { read: true });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      await Notification.updateMany(
        { userId: user.userId, _id: { $in: notificationIds } },
        { read: true }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notifications updated.",
    });
  } catch (error: any) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
