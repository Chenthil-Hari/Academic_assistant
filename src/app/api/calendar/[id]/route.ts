import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { AcademicEvent } from "@/lib/db/models/AcademicEvent";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const body = await req.json();
    const { title, type, date, endDate, subjectId, description, isHoliday, isCompleted } = body;

    await connectToDatabase();

    const event = await AcademicEvent.findOne({ _id: params.id, userId: user.userId });
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    if (title) event.title = title.trim();
    if (type) event.type = type;
    if (date) event.date = new Date(date);
    if (endDate !== undefined) event.endDate = endDate ? new Date(endDate) : undefined;
    if (subjectId !== undefined) event.subjectId = subjectId || undefined;
    if (description !== undefined) event.description = description.trim();
    if (isHoliday !== undefined) event.isHoliday = Boolean(isHoliday);
    if (isCompleted !== undefined) event.isCompleted = Boolean(isCompleted);

    await event.save();

    const populated = await AcademicEvent.findById(event._id).populate(
      "subjectId",
      "code name color"
    );

    return NextResponse.json({
      success: true,
      message: "Event updated successfully.",
      event: populated,
    });
  } catch (error: any) {
    console.error("PUT /api/calendar/[id] error:", error);
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

    const event = await AcademicEvent.findOneAndDelete({ _id: params.id, userId: user.userId });
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully.",
    });
  } catch (error: any) {
    console.error("DELETE /api/calendar/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
