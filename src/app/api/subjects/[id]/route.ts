import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { Subject } from "@/lib/db/models/Subject";
import { Timetable } from "@/lib/db/models/Timetable";
import { Attendance } from "@/lib/db/models/Attendance";
import { ClassSession } from "@/lib/db/models/ClassSession";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const body = await req.json();
    const { code, name, credit, faculty, color, minAttendanceThreshold } = body;

    await connectToDatabase();

    const subject = await Subject.findOne({ _id: params.id, userId: user.userId });
    if (!subject) {
      return NextResponse.json({ success: false, message: "Subject not found." }, { status: 404 });
    }

    if (code) subject.code = code.trim().toUpperCase();
    if (name) subject.name = name.trim();
    if (credit !== undefined) subject.credit = Number(credit);
    if (faculty !== undefined) subject.faculty = faculty.trim();
    if (color) subject.color = color;
    if (minAttendanceThreshold !== undefined) subject.minAttendanceThreshold = Number(minAttendanceThreshold);

    await subject.save();

    return NextResponse.json({
      success: true,
      message: "Subject updated successfully.",
      subject,
    });
  } catch (error: any) {
    console.error("PUT /api/subjects/[id] error:", error);
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

    const subject = await Subject.findOneAndDelete({ _id: params.id, userId: user.userId });
    if (!subject) {
      return NextResponse.json({ success: false, message: "Subject not found." }, { status: 404 });
    }

    // Cascade cleanups for this subject
    await Timetable.deleteMany({ userId: user.userId, subjectId: params.id });
    await ClassSession.deleteMany({ userId: user.userId, subjectId: params.id });
    await Attendance.deleteMany({ userId: user.userId, subjectId: params.id });

    return NextResponse.json({
      success: true,
      message: "Subject and related timetable slots deleted successfully.",
    });
  } catch (error: any) {
    console.error("DELETE /api/subjects/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
