import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { getOrCreateDailyCheckin, normalizeDate } from "@/lib/attendance/session-generator";
import { Attendance } from "@/lib/db/models/Attendance";
import { ClassSession } from "@/lib/db/models/ClassSession";
import { createAuditLog } from "@/lib/db/audit";

export const dynamic = "force-dynamic";

// GET /api/attendance/checkin - Get today's check-in checklist
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    const checkin = await getOrCreateDailyCheckin(user.userId, targetDate);

    return NextResponse.json({
      success: true,
      ...checkin,
      date: normalizeDate(targetDate).toISOString().split("T")[0],
    });
  } catch (error: any) {
    console.error("GET /api/attendance/checkin error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/attendance/checkin - Confirm attendance checklist
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const body = await req.json();
    const { items } = body as {
      items: Array<{
        attendanceId: string;
        sessionId?: string;
        status: "Attended" | "Absent" | "Cancelled" | "Pending";
        notes?: string;
      }>;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "No attendance items provided." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const updatedCount = [];

    for (const item of items) {
      if (!item.attendanceId || !item.status) continue;

      const record = await Attendance.findOne({
        _id: item.attendanceId,
        userId: user.userId,
      });

      if (!record) continue;

      const previousStatus = record.status;
      record.status = item.status;
      record.markedAt = new Date();
      record.source = "daily_checkin";
      if (item.notes !== undefined) record.notes = item.notes;
      await record.save();

      // If associated with a ClassSession, sync session status
      if (record.classSessionId) {
        let sessionStatus: "Conducted" | "Cancelled" | "Scheduled" = "Conducted";
        if (item.status === "Cancelled") sessionStatus = "Cancelled";
        else if (item.status === "Pending") sessionStatus = "Scheduled";

        await ClassSession.findByIdAndUpdate(record.classSessionId, {
          status: sessionStatus,
        });
      }

      // Log audit
      if (previousStatus !== item.status) {
        await createAuditLog({
          userId: user.userId,
          action: "DAILY_CHECKIN_CONFIRMED",
          entityType: "Attendance",
          entityId: record._id,
          previousData: { status: previousStatus },
          newData: { status: item.status, notes: item.notes },
          reason: "Confirmed via daily 4 PM check-in",
          ipAddress: req.headers.get("x-forwarded-for") || "",
        });
      }

      updatedCount.push(record._id);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully confirmed attendance for ${updatedCount.length} classes.`,
      updatedIds: updatedCount,
    });
  } catch (error: any) {
    console.error("POST /api/attendance/checkin error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
