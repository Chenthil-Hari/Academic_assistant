import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { syncAttendanceWithTimetable } from "@/lib/attendance/timetable-sync";

export const dynamic = "force-dynamic";

// POST /api/attendance/sync - Synchronize attendance records & class sessions with the active timetable
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const { date, cleanOrphaned = true, forceCleanSubjectId } = body;

    const targetDate = date ? new Date(date) : new Date();

    const result = await syncAttendanceWithTimetable(user.userId, targetDate, {
      cleanOrphaned: Boolean(cleanOrphaned),
      forceCleanSubjectId,
    });

    return NextResponse.json({
      success: true,
      message: `Timetable synchronization complete for ${result.date}. Added: ${result.addedSessions}, Updated: ${result.updatedSessions}, Removed out-of-sync: ${result.removedRecords}.`,
      result,
    });
  } catch (error: any) {
    console.error("POST /api/attendance/sync error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
