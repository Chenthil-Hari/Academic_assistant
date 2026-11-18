import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { Subject } from "@/lib/db/models/Subject";
import { Attendance } from "@/lib/db/models/Attendance";
import {
  calculateSubjectMetrics,
  calculateOverallMetrics,
  SubjectAttendanceMetrics,
} from "@/lib/attendance/calculations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();

    // Fetch user to get their target attendance percentage setting
    const userDoc = await User.findById(user.userId).select("targetAttendancePercentage");
    const defaultTarget = userDoc?.targetAttendancePercentage || 75;

    // Fetch all user's subjects
    const subjects = await Subject.find({ userId: user.userId }).sort({ code: 1 });

    // Aggregate attendance counts by subject and status
    // Note: Cancelled and Pending are tracked but do NOT count towards conducted classes!
    const attendanceAgg = await Attendance.aggregate([
      { $match: { userId: userDoc?._id || user.userId } },
      {
        $group: {
          _id: { subjectId: "$subjectId", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Build lookup map: `${subjectId}_${status}` -> count
    const countMap: Record<string, number> = {};
    for (const row of attendanceAgg) {
      if (row._id?.subjectId && row._id?.status) {
        const key = `${row._id.subjectId.toString()}_${row._id.status}`;
        countMap[key] = row.count;
      }
    }

    const subjectMetrics: SubjectAttendanceMetrics[] = subjects.map((sub) => {
      const subId = sub._id.toString();
      const attended = countMap[`${subId}_Attended`] || 0;
      const absent = countMap[`${subId}_Absent`] || 0;
      const cancelled = countMap[`${subId}_Cancelled`] || 0;
      const pending = countMap[`${subId}_Pending`] || 0;
      const target = sub.minAttendanceThreshold || defaultTarget;

      return calculateSubjectMetrics({
        subjectId: subId,
        subjectCode: sub.code,
        subjectName: sub.name,
        color: sub.color,
        attended,
        absent,
        cancelled,
        pending,
        targetPercentage: target,
      });
    });

    const overallMetrics = calculateOverallMetrics(subjectMetrics, defaultTarget);

    return NextResponse.json({
      success: true,
      targetPercentage: defaultTarget,
      overall: overallMetrics,
      subjects: subjectMetrics,
    });
  } catch (error: any) {
    console.error("GET /api/attendance/stats error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
