import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { Subject } from "@/lib/db/models/Subject";
import { Attendance } from "@/lib/db/models/Attendance";
import { calculateSubjectMetrics } from "@/lib/attendance/calculations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "summary"; // 'summary' or 'logs'

    const userDoc = await User.findById(user.userId);
    const defaultTarget = userDoc?.targetAttendancePercentage || 75;

    if (type === "summary") {
      const subjects = await Subject.find({ userId: user.userId }).sort({ code: 1 });
      const attendanceAgg = await Attendance.aggregate([
        { $match: { userId: userDoc?._id || user.userId } },
        {
          $group: {
            _id: { subjectId: "$subjectId", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ]);

      const countMap: Record<string, number> = {};
      for (const row of attendanceAgg) {
        if (row._id?.subjectId && row._id?.status) {
          countMap[`${row._id.subjectId.toString()}_${row._id.status}`] = row.count;
        }
      }

      const rows = [
        [
          "Subject Code",
          "Subject Name",
          "Attended",
          "Absent",
          "Conducted",
          "Cancelled",
          "Pending",
          "Attendance %",
          "Target %",
          "Classes Needed",
          "Max Classes Can Miss",
          "Status",
        ],
      ];

      for (const sub of subjects) {
        const subId = sub._id.toString();
        const attended = countMap[`${subId}_Attended`] || 0;
        const absent = countMap[`${subId}_Absent`] || 0;
        const cancelled = countMap[`${subId}_Cancelled`] || 0;
        const pending = countMap[`${subId}_Pending`] || 0;
        const target = sub.minAttendanceThreshold || defaultTarget;

        const metrics = calculateSubjectMetrics({
          subjectId: subId,
          subjectCode: sub.code,
          subjectName: sub.name,
          attended,
          absent,
          cancelled,
          pending,
          targetPercentage: target,
        });

        rows.push([
          `"${metrics.subjectCode}"`,
          `"${metrics.subjectName}"`,
          metrics.attended.toString(),
          metrics.absent.toString(),
          metrics.conducted.toString(),
          metrics.cancelled.toString(),
          metrics.pending.toString(),
          `${metrics.percentage}%`,
          `${metrics.targetPercentage}%`,
          metrics.classesNeededForTarget.toString(),
          metrics.maxClassesCanMiss.toString(),
          metrics.status,
        ]);
      }

      const csvContent = rows.map((r) => r.join(",")).join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="academic_ai_attendance_summary_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    } else {
      // Detailed Attendance Logs
      const records = await Attendance.find({ userId: user.userId })
        .populate("subjectId", "code name")
        .sort({ date: -1, markedAt: -1 });

      const rows = [
        ["Date", "Subject Code", "Subject Name", "Status", "Marked At", "Source", "Notes"],
      ];

      for (const rec of records as any[]) {
        rows.push([
          rec.date ? rec.date.toISOString().split("T")[0] : "",
          `"${rec.subjectId?.code || "Unknown"}"`,
          `"${rec.subjectId?.name || "Unknown"}"`,
          rec.status,
          rec.markedAt ? rec.markedAt.toISOString() : "",
          rec.source,
          `"${(rec.notes || "").replace(/"/g, '""')}"`,
        ]);
      }

      const csvContent = rows.map((r) => r.join(",")).join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="academic_ai_attendance_logs_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }
  } catch (error: any) {
    console.error("Export CSV error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
