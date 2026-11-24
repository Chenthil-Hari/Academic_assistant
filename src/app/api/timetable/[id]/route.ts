import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { Timetable } from "@/lib/db/models/Timetable";
import { syncAttendanceWithTimetable } from "@/lib/attendance/timetable-sync";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const body = await req.json();
    const { subjectId, dayOfWeek, startTime, endTime, room, type, isActive } = body;

    await connectToDatabase();

    const slot = await Timetable.findOne({ _id: params.id, userId: user.userId });
    if (!slot) {
      return NextResponse.json({ success: false, message: "Timetable slot not found." }, { status: 404 });
    }

    const previousDayOfWeek = slot.dayOfWeek;
    if (subjectId) slot.subjectId = subjectId;
    if (dayOfWeek !== undefined) slot.dayOfWeek = Number(dayOfWeek);
    if (startTime) slot.timeSlot.startTime = startTime.trim();
    if (endTime) slot.timeSlot.endTime = endTime.trim();
    if (room !== undefined) slot.room = room.trim();
    if (type) slot.type = type;
    if (isActive !== undefined) slot.isActive = Boolean(isActive);

    await slot.save();

    // Auto-sync attendance for today if affected by this slot change
    const today = new Date();
    if (today.getDay() === slot.dayOfWeek || today.getDay() === previousDayOfWeek) {
      try {
        await syncAttendanceWithTimetable(user.userId, today, { cleanOrphaned: true });
      } catch (syncErr) {
        console.warn("Auto-sync attendance failed on timetable PUT:", syncErr);
      }
    }

    const populated = await Timetable.findById(slot._id).populate(
      "subjectId",
      "code name color faculty"
    );

    return NextResponse.json({
      success: true,
      message: "Timetable slot updated successfully.",
      slot: populated,
    });
  } catch (error: any) {
    console.error("PUT /api/timetable/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();

    const slot = await Timetable.findOneAndDelete({ _id: params.id, userId: user.userId });
    if (!slot) {
      return NextResponse.json({ success: false, message: "Timetable slot not found." }, { status: 404 });
    }

    // Auto-sync attendance for today if deleted slot was on today's weekday
    const today = new Date();
    if (today.getDay() === slot.dayOfWeek) {
      try {
        await syncAttendanceWithTimetable(user.userId, today, { cleanOrphaned: true });
      } catch (syncErr) {
        console.warn("Auto-sync attendance failed on timetable DELETE:", syncErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Timetable slot removed successfully.",
    });
  } catch (error: any) {
    console.error("DELETE /api/timetable/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
