import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { Timetable } from "@/lib/db/models/Timetable";
import { Subject } from "@/lib/db/models/Subject";
import { syncAttendanceWithTimetable } from "@/lib/attendance/timetable-sync";

export const dynamic = "force-dynamic";

// GET /api/timetable - List timetable slots populated with subject details
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const day = searchParams.get("day");

    const query: any = { userId: user.userId, isActive: true };
    if (day !== null && day !== undefined && day !== "") {
      query.dayOfWeek = Number(day);
    }

    const slots = await Timetable.find(query)
      .populate("subjectId", "code name color faculty")
      .sort({ dayOfWeek: 1, "timeSlot.startTime": 1 });

    return NextResponse.json({
      success: true,
      slots,
    });
  } catch (error: any) {
    console.error("GET /api/timetable error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/timetable - Add new timetable slot
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const body = await req.json();
    const { subjectId, dayOfWeek, startTime, endTime, room, type } = body;

    if (!subjectId || dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, message: "Subject, day of week, and start/end time are required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Verify subject belongs to user
    const subject = await Subject.findOne({ _id: subjectId, userId: user.userId });
    if (!subject) {
      return NextResponse.json(
        { success: false, message: "Invalid subject selected." },
        { status: 400 }
      );
    }

    const slot = await Timetable.create({
      userId: user.userId,
      subjectId,
      dayOfWeek: Number(dayOfWeek),
      timeSlot: {
        startTime: startTime.trim(),
        endTime: endTime.trim(),
      },
      room: room?.trim() || "",
      type: type || "Lecture",
      isActive: true,
    });

    const populatedSlot = await Timetable.findById(slot._id).populate(
      "subjectId",
      "code name color faculty"
    );

    // Synchronize today's sessions if slot is added for today's weekday
    const today = new Date();
    if (today.getDay() === Number(dayOfWeek)) {
      try {
        await syncAttendanceWithTimetable(user.userId, today);
      } catch (syncErr) {
        console.warn("Auto-sync attendance failed on timetable add:", syncErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Timetable slot added successfully.",
      slot: populatedSlot,
    });
  } catch (error: any) {
    console.error("POST /api/timetable error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
