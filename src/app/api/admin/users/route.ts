import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();

    // Verify admin privileges: strictly restricted to Hari's login
    const isAdmin = user.email?.toLowerCase() === "chenthilhari@gmail.com";

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Administrator privileges required." },
        { status: 403 }
      );
    }

    const [pendingUsers, approvedUsers, rejectedUsers] = await Promise.all([
      User.find({ status: "pending" })
        .select("-passwordHash -resetPasswordToken -resetPasswordExpires -telegramLinkToken -telegramLinkTokenExpires")
        .sort({ createdAt: -1 }),
      User.find({ status: "approved" })
        .select("-passwordHash -resetPasswordToken -resetPasswordExpires -telegramLinkToken -telegramLinkTokenExpires")
        .sort({ approvedAt: -1, createdAt: -1 }),
      User.find({ status: "rejected" })
        .select("-passwordHash -resetPasswordToken -resetPasswordExpires -telegramLinkToken -telegramLinkTokenExpires")
        .sort({ rejectedAt: -1, createdAt: -1 }),
    ]);

    return NextResponse.json({
      success: true,
      counts: {
        pending: pendingUsers.length,
        approved: approvedUsers.length,
        rejected: rejectedUsers.length,
        total: pendingUsers.length + approvedUsers.length + rejectedUsers.length,
      },
      pendingUsers,
      approvedUsers,
      rejectedUsers,
    });
  } catch (error: any) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch user requests." },
      { status: 500 }
    );
  }
}
