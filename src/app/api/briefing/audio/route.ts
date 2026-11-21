import { NextRequest, NextResponse } from "next/server";
import { EdgeTTS } from "@andresaya/edge-tts";
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

const VALID_VOICES: Record<string, string> = {
  christopher: "en-US-ChristopherNeural",
  jenny: "en-US-JennyNeural",
  prabhat: "en-IN-PrabhatNeural",
  neerja: "en-IN-NeerjaNeural",
  aria: "en-US-AriaNeural",
  guy: "en-US-GuyNeural",
};

export async function GET(req: NextRequest) {
  return handleAudioRequest(req);
}

export async function POST(req: NextRequest) {
  return handleAudioRequest(req);
}

async function handleAudioRequest(req: NextRequest) {
  try {
    const session = getUserFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const voiceKey = searchParams.get("voice") || "christopher";
    const selectedVoice = VALID_VOICES[voiceKey.toLowerCase()] || VALID_VOICES.christopher;

    let customText = searchParams.get("text");

    // If no custom text passed, fetch and generate today's briefing
    if (!customText) {
      await connectToDatabase();
      const user = await User.findById(session.userId);
      if (!user) {
        return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
      }

      customText = await generateBriefingText(user);
    }

    // Generate real neural voice MP3 audio buffer using Edge TTS (100% Free, Azure Neural Voice)
    const tts = new EdgeTTS();
    const result = await tts.generate(customText, selectedVoice);
    const audioBuffer = result.audio;

    return new NextResponse(audioBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Voice-Used": selectedVoice,
      },
    });
  } catch (error: any) {
    console.error("GET /api/briefing/audio error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to generate real voice audio" },
      { status: 500 }
    );
  }
}

async function generateBriefingText(user: any): Promise<string> {
  const now = new Date();
  const istDateString = now.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istDateString);
  const dayOfWeek = istDate.getDay();

  const startOfToday = new Date(istDate);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(istDate);
  endOfToday.setHours(23, 59, 59, 999);

  const studentName = user.name ? user.name.split(" ")[0] : "Student";
  const targetPercentage = user.targetAttendancePercentage || 75;

  // Check holiday
  const holiday = await AcademicEvent.findOne({
    userId: user._id,
    $or: [
      { type: "Holiday", date: { $gte: startOfToday, $lte: endOfToday } },
      { isHoliday: true, date: { $gte: startOfToday, $lte: endOfToday } },
    ],
  });

  if (holiday) {
    return `Good morning ${studentName}! Today is marked as a holiday for ${holiday.title}. No classes are scheduled for today. Have a restful and productive day!`;
  }

  // Today's classes
  const slots = await Timetable.find({
    userId: user._id,
    dayOfWeek,
    isActive: true,
  })
    .populate("subjectId")
    .sort({ startTime: 1 });

  const classesToday = slots.map((s: any) => ({
    subjectName: s.subjectId?.name || "Subject",
    room: s.room || "Room TBA",
    startTime: s.startTime,
  }));

  // Attendance stats for critical subject
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

    if (metrics.conducted > 0 && metrics.percentage < lowestPct) {
      lowestPct = metrics.percentage;
      criticalSubjectInfo = {
        name: sub.name,
        percentage: metrics.percentage,
        targetPercentage: subTarget,
        deficit: metrics.classesNeededForTarget,
      };
    }
  }

  // Upcoming deadlines in 3 days
  const threeDaysLater = new Date(startOfToday.getTime() + 3 * 24 * 60 * 60 * 1000);
  const upcomingEvents = await AcademicEvent.find({
    userId: user._id,
    type: { $in: ["Assignment", "Exam"] },
    date: { $gte: startOfToday, $lte: threeDaysLater },
  }).sort({ date: 1 });

  const parts: string[] = [];

  if (classesToday.length === 0) {
    parts.push(`Good morning ${studentName}! You have no classes scheduled for today.`);
  } else {
    const firstClass = classesToday[0];
    const startFormatted = formatTime(firstClass.startTime);
    parts.push(
      `Good morning ${studentName}! You have ${classesToday.length} class${
        classesToday.length > 1 ? "es" : ""
      } today starting at ${startFormatted} with ${firstClass.subjectName} in ${firstClass.room}.`
    );
  }

  if (criticalSubjectInfo) {
    const pct = Math.round(criticalSubjectInfo.percentage);
    if (pct < criticalSubjectInfo.targetPercentage) {
      parts.push(
        `Your attendance in ${criticalSubjectInfo.name} is currently at ${pct}%, which is below your target of ${criticalSubjectInfo.targetPercentage}%. You need ${criticalSubjectInfo.deficit} consecutive class${criticalSubjectInfo.deficit > 1 ? "es" : ""} to recover.`
      );
    } else if (pct <= criticalSubjectInfo.targetPercentage + 3) {
      parts.push(
        `Your attendance in ${criticalSubjectInfo.name} is currently at ${pct}% — attending today keeps you in the safe zone.`
      );
    } else {
      parts.push(
        `Your attendance in ${criticalSubjectInfo.name} is safe at ${pct}%.`
      );
    }
  }

  if (upcomingEvents.length > 0) {
    const nextEvent = upcomingEvents[0];
    const hoursUntil = Math.max(
      1,
      Math.round((new Date(nextEvent.date).getTime() - now.getTime()) / (1000 * 60 * 60))
    );
    const timeStr = hoursUntil <= 24 ? "today" : hoursUntil <= 48 ? "in 48 hours" : `in ${Math.round(hoursUntil / 24)} days`;
    parts.push(`${nextEvent.title} (${nextEvent.type}) is due ${timeStr}.`);
  }

  return parts.join(" ");
}
