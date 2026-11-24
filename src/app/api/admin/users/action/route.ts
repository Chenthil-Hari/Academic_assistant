import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import {
  User,
  Subject,
  Timetable,
  AcademicEvent,
  ClassSession,
  Attendance,
  UploadedDocument,
  Conversation,
  Notification,
  AuditLog,
  GateSubject,
  GateUserSettings,
  GateStudySession,
  GateProgress,
  GatePYQProgress,
  GateMistake,
  GateWeeklyReport,
} from "@/lib/db/models";
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

    // Verify admin: strictly restricted to Hari's login
    const isAdmin = user.email?.toLowerCase() === "chenthilhari@gmail.com";

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Administrator privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, action, rejectionReason } = body;

    if (!userId || !action || !["approve", "reject", "resend-invite", "delete"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Valid userId and action ('approve', 'reject', 'resend-invite', or 'delete') are required." },
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
      targetUser.approvedBy = new mongoose.Types.ObjectId(user.userId);
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

    if (action === "resend-invite") {
      const emailResult = await sendRegistrationApprovedEmail(
        targetUser.email,
        targetUser.name
      );

      return NextResponse.json({
        success: true,
        message: emailResult.success
          ? `Activation email resent successfully to ${targetUser.email}!`
          : `Failed to resend activation email: ${emailResult.error}`,
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

    if (action === "delete") {
      if (targetUser.email?.toLowerCase() === "chenthilhari@gmail.com") {
        return NextResponse.json(
          { success: false, message: "Cannot delete the root administrator account." },
          { status: 400 }
        );
      }

      const targetId = targetUser._id;
      const targetName = targetUser.name;
      const targetEmail = targetUser.email;

      // Permanently and fully delete user and ALL related data across all 17 collections
      await Promise.all([
        User.deleteOne({ _id: targetId }),
        Attendance.deleteMany({ userId: targetId }),
        ClassSession.deleteMany({ userId: targetId }),
        Timetable.deleteMany({ userId: targetId }),
        Subject.deleteMany({ userId: targetId }),
        AcademicEvent.deleteMany({ userId: targetId }),
        UploadedDocument.deleteMany({ userId: targetId }),
        Conversation.deleteMany({ userId: targetId }),
        Notification.deleteMany({ userId: targetId }),
        AuditLog.deleteMany({ userId: targetId }),
        GateSubject.deleteMany({ userId: targetId }),
        GateUserSettings.deleteMany({ userId: targetId }),
        GateStudySession.deleteMany({ userId: targetId }),
        GateProgress.deleteMany({ userId: targetId }),
        GatePYQProgress.deleteMany({ userId: targetId }),
        GateMistake.deleteMany({ userId: targetId }),
        GateWeeklyReport.deleteMany({ userId: targetId }),
      ]);

      return NextResponse.json({
        success: true,
        message: `User ${targetName} (${targetEmail}) and all their academic, attendance, timetable, and planner data have been permanently deleted from the database.`,
        deletedUserId: targetId,
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
