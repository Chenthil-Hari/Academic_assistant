import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { Subject } from "@/lib/db/models/Subject";
import { Timetable } from "@/lib/db/models/Timetable";
import { AcademicEvent } from "@/lib/db/models/AcademicEvent";
import { Attendance } from "@/lib/db/models/Attendance";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { calculateSubjectMetrics } from "@/lib/attendance/calculations";
import { formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = getUserFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Determine current IST time
    const now = new Date();
    const istDateString = now.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istDateString);
    const dayOfWeek = istDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // 1. Check for institutional Holiday today
    const startOfToday = new Date(istDate);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(istDate);
    endOfToday.setHours(23, 59, 59, 999);

    const holiday = await AcademicEvent.findOne({
      userId: user._id,
      $or: [
        { type: "Holiday", date: { $gte: startOfToday, $lte: endOfToday } },
        { isHoliday: true, date: { $gte: startOfToday, $lte: endOfToday } },
      ],
    });

    const studentName = user.name ? user.name.split(" ")[0] : "Student";
    const targetPercentage = user.targetAttendancePercentage || 75;

    if (holiday) {
      const holidayBriefing = `Good morning ${studentName}! Today is marked as a holiday for ${holiday.title}. No classes are scheduled for today. Have a restful and productive day!`;
      return NextResponse.json({
        success: true,
        briefingText: holidayBriefing,
        studentName,
        isHoliday: true,
        holidayTitle: holiday.title,
        classesToday: [],
        upcomingEvents: [],
      });
    }

    // 2. Fetch today's classes
    const slots = await Timetable.find({
      userId: user._id,
      dayOfWeek,
      isActive: true,
    })
      .populate("subjectId")
      .sort({ startTime: 1 });

    const classesToday = slots.map((s: any) => ({
      slotId: s._id,
      subjectName: s.subjectId?.name || "Subject",
      subjectCode: s.subjectId?.code || "",
      room: s.room || "Room TBA",
      startTime: s.startTime,
      endTime: s.endTime,
      formattedTime: `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`,
      type: s.sessionType || "Lecture",
    }));

    // 3. Fetch attendance stats to find critical subject
    const subjects = await Subject.find({ userId: user._id });
    const attendances = await Attendance.find({ userId: user._id });

    let criticalSubjectInfo: any = null;
    let lowestPct = 101;

    for (const sub of subjects) {
      const subAtt = attendances.filter(
        (a) => a.subjectId.toString() === sub._id.toString()
      );
      const attended = subAtt.filter((a) => a.status === "Attended").length;
      const absent = subAtt.filter((a) => a.status === "Absent").length;
      const cancelled = subAtt.filter((a) => a.status === "Cancelled").length;
      const pending = subAtt.filter((a) => a.status === "Pending").length;
      const subTarget = sub.minAttendanceThreshold || targetPercentage;

      const metrics = calculateSubjectMetrics({
        subjectId: sub._id.toString(),
        subjectCode: sub.code,
        subjectName: sub.name,
        attended,
        absent,
        cancelled,
        pending,
        targetPercentage: subTarget,
      });

      if (metrics.conducted > 0) {
        if (metrics.percentage < lowestPct) {
          lowestPct = metrics.percentage;
          criticalSubjectInfo = {
            name: sub.name,
            code: sub.code,
            percentage: metrics.percentage,
            targetPercentage: subTarget,
            buffer: metrics.maxClassesCanMiss,
            deficit: metrics.classesNeededForTarget,
            isScheduledToday: slots.some(
              (s: any) => s.subjectId?._id.toString() === sub._id.toString()
            ),
          };
        }
      }
    }

    // 4. Query upcoming deadlines or exams in the next 3 days
    const threeDaysLater = new Date(startOfToday.getTime() + 3 * 24 * 60 * 60 * 1000);
    const upcomingEvents = await AcademicEvent.find({
      userId: user._id,
      type: { $in: ["Assignment", "Exam"] },
      date: { $gte: startOfToday, $lte: threeDaysLater },
    }).sort({ date: 1 });

    // 5. Construct synthesized human natural briefing text
    const briefingParts: string[] = [];

    // Part A: Greeting & schedule
    if (classesToday.length === 0) {
      briefingParts.push(`Good morning ${studentName}! You have no classes scheduled for today.`);
    } else {
      const firstClass = classesToday[0];
      const startFormatted = formatTime(firstClass.startTime);
      briefingParts.push(
        `Good morning ${studentName}! You have ${classesToday.length} class${
          classesToday.length > 1 ? "es" : ""
        } today starting at ${startFormatted} with ${firstClass.subjectName} in ${firstClass.room}.`
      );
    }

    // Part B: Critical Attendance Alert
    if (criticalSubjectInfo) {
      const pctRounded = Math.round(criticalSubjectInfo.percentage);
      if (pctRounded < criticalSubjectInfo.targetPercentage) {
        briefingParts.push(
          `Your attendance in ${criticalSubjectInfo.name} is currently at ${pctRounded}%, which is below your target of ${criticalSubjectInfo.targetPercentage}%. You need ${criticalSubjectInfo.deficit} consecutive class${criticalSubjectInfo.deficit > 1 ? "es" : ""} to recover.`
        );
      } else if (pctRounded <= criticalSubjectInfo.targetPercentage + 3) {
        briefingParts.push(
          `Your attendance in ${criticalSubjectInfo.name} is currently at ${pctRounded}% — attending today keeps you in the safe zone.`
        );
      } else {
        briefingParts.push(
          `Your attendance in ${criticalSubjectInfo.name} is currently safe at ${pctRounded}%.`
        );
      }
    }

    // Part C: Upcoming Deadlines / Exams
    if (upcomingEvents.length > 0) {
      const nextEvent = upcomingEvents[0];
      const hoursUntil = Math.max(
        1,
        Math.round((new Date(nextEvent.date).getTime() - now.getTime()) / (1000 * 60 * 60))
      );
      const timeStr = hoursUntil <= 24 ? "today" : hoursUntil <= 48 ? "in 48 hours" : `in ${Math.round(hoursUntil / 24)} days`;
      const eventLabel = nextEvent.type;
      briefingParts.push(`${nextEvent.title} (${eventLabel}) is due ${timeStr}.`);
    }

    const briefingText = briefingParts.join(" ");

    return NextResponse.json({
      success: true,
      briefingText,
      studentName,
      classesCount: classesToday.length,
      firstClass: classesToday[0] || null,
      classesToday,
      criticalSubject: criticalSubjectInfo,
      upcomingEvents: upcomingEvents.map((e) => ({
        id: e._id,
        title: e.title,
        eventType: e.type,
        startDate: e.date,
      })),
      targetPercentage,
    });
  } catch (error: any) {
    console.error("GET /api/briefing/morning error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to generate morning briefing" },
      { status: 500 }
    );
  }
}
