import connectToDatabase from "@/lib/db/connection";
import { Timetable } from "@/lib/db/models/Timetable";
import { AcademicEvent } from "@/lib/db/models/AcademicEvent";
import { ClassSession } from "@/lib/db/models/ClassSession";
import { Attendance } from "@/lib/db/models/Attendance";
import mongoose from "mongoose";

export interface CheckinItem {
  attendanceId: string;
  sessionId: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  color: string;
  startTime: string;
  endTime: string;
  room: string;
  type: string;
  status: "Attended" | "Absent" | "Cancelled" | "Pending";
  date: string; // YYYY-MM-DD
}

/**
 * Normalizes date to midnight UTC / local day start
 */
export function normalizeDate(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Generates or retrieves daily check-in sessions and attendance records for a user
 */
export async function getOrCreateDailyCheckin(
  userId: string | mongoose.Types.ObjectId,
  targetDate: Date = new Date()
): Promise<{
  isHoliday: boolean;
  holidayTitle?: string;
  items: CheckinItem[];
  allConfirmed: boolean;
}> {
  await connectToDatabase();

  const userObjectId = new mongoose.Types.ObjectId(userId.toString());
  const normalizedDate = normalizeDate(targetDate);
  const nextDay = new Date(normalizedDate);
  nextDay.setDate(nextDay.getDate() + 1);

  // 1. Check if today is marked as a holiday in AcademicEvents
  const holiday = await AcademicEvent.findOne({
    userId: userObjectId,
    isHoliday: true,
    date: { $gte: normalizedDate, $lt: nextDay },
  });

  if (holiday) {
    return {
      isHoliday: true,
      holidayTitle: holiday.title,
      items: [],
      allConfirmed: true,
    };
  }

  // 2. Determine dayOfWeek (0 = Sunday, 1 = Monday, ...)
  const dayOfWeek = normalizedDate.getDay();

  // 3. Find user's active timetable slots for this weekday
  const slots = await Timetable.find({
    userId: userObjectId,
    dayOfWeek,
    isActive: true,
  }).populate("subjectId", "code name color faculty");

  if (!slots || slots.length === 0) {
    return {
      isHoliday: false,
      items: [],
      allConfirmed: true,
    };
  }

  const items: CheckinItem[] = [];
  let allConfirmed = true;

  for (const slot of slots) {
    if (!slot.subjectId) continue;
    const subject = slot.subjectId as any;

    // Find or create ClassSession for this slot & date
    let session = await ClassSession.findOne({
      userId: userObjectId,
      subjectId: subject._id,
      date: normalizedDate,
      startTime: slot.timeSlot.startTime,
    });

    if (!session) {
      session = await ClassSession.create({
        userId: userObjectId,
        subjectId: subject._id,
        timetableSlotId: slot._id,
        date: normalizedDate,
        startTime: slot.timeSlot.startTime,
        endTime: slot.timeSlot.endTime,
        room: slot.room || "",
        type: slot.type || "Lecture",
        status: "Scheduled",
      });
    }

    // Find or create Attendance record for this session
    let attendance = await Attendance.findOne({
      userId: userObjectId,
      classSessionId: session._id,
    });

    if (!attendance) {
      attendance = await Attendance.create({
        userId: userObjectId,
        subjectId: subject._id,
        classSessionId: session._id,
        date: normalizedDate,
        status: "Pending",
        source: "daily_checkin",
      });
    }

    if (attendance.status === "Pending") {
      allConfirmed = false;
    }

    items.push({
      attendanceId: attendance._id.toString(),
      sessionId: session._id.toString(),
      subjectId: subject._id.toString(),
      subjectCode: subject.code,
      subjectName: subject.name,
      color: subject.color || "#3B82F6",
      startTime: slot.timeSlot.startTime,
      endTime: slot.timeSlot.endTime,
      room: slot.room || "",
      type: slot.type || "Lecture",
      status: attendance.status,
      date: normalizedDate.toISOString().split("T")[0],
    });
  }

  // Sort by startTime
  items.sort((a, b) => a.startTime.localeCompare(b.startTime));

  return {
    isHoliday: false,
    items,
    allConfirmed,
  };
}
