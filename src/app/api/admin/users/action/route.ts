import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import {
  sendRegistrationApprovedEmail,
  sendRegistrationRejectedEmail,
} from "@/lib/email/resend";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();

    // Verify admin
    const adminUser = await User.findById(user.userId);
    const isAdmin =
      user.email === "chenthilhari@gmail.com" ||
      adminUser?.role === "admin" ||
      adminUser?.email === "chenthilhari@gmail.com";

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Administrator privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, action, rejectionReason } = body;

    if (!userId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Valid userId and action ('approve' or 'reject') are required." },
        { status: 400 }
      );
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "Target user not found." },
        { status: 404 }
      );
    }

    if (action === "approve") {
      targetUser.status = "approved";
      targetUser.approvedAt = new Date();
      targetUser.approvedBy = adminUser?._id;
      targetUser.rejectionReason = "";
      await targetUser.save();

      // Send approval notification email via Resend
      const emailResult = await sendRegistrationApprovedEmail(
        targetUser.email,
        targetUser.name
      );

      return NextResponse.json({
        success: true,
        message: `Account for ${targetUser.name} (${targetUser.email}) approved successfully! Activation email delivered.`,
        user: {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          status: targetUser.status,
          approvedAt: targetUser.approvedAt,
        },
        emailDelivered: emailResult.success,
      });
    }

    if (action === "reject") {
      targetUser.status = "rejected";
      targetUser.rejectedAt = new Date();
      targetUser.rejectionReason = rejectionReason?.trim() || "Application criteria not met.";
      await targetUser.save();

      // Send rejection notification email via Resend
      const emailResult = await sendRegistrationRejectedEmail(
        targetUser.email,
        targetUser.name,
        targetUser.rejectionReason
      );

      return NextResponse.json({
        success: true,
        message: `Registration request for ${targetUser.name} (${targetUser.email}) has been rejected. Notification email sent.`,
        user: {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          status: targetUser.status,
          rejectedAt: targetUser.rejectedAt,
          rejectionReason: targetUser.rejectionReason,
        },
        emailDelivered: emailResult.success,
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Admin user action error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process user action." },
      { status: 500 }
    );
  }
}
