import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";

// GET /api/notifications/subscribe - returns public key
export async function GET() {
  return NextResponse.json({
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  });
}

// POST /api/notifications/subscribe - Save web push subscription
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const { subscription } = await req.json();
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { success: false, message: "Valid PushSubscription object is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    await User.findByIdAndUpdate(user.userId, {
      webPushSubscription: subscription,
      "notificationPreferences.webPush": true,
    });

    return NextResponse.json({
      success: true,
      message: "Push notifications successfully enabled.",
    });
  } catch (error: any) {
    console.error("Subscription save error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
