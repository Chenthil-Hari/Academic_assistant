import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { AcademicEvent } from "@/lib/db/models/AcademicEvent";

export const dynamic = "force-dynamic";

// GET /api/calendar - List events with optional date filtering or type filtering
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const month = searchParams.get("month"); // 1-12
    const year = searchParams.get("year");   // e.g. 2026
    const upcoming = searchParams.get("upcoming"); // boolean

    const query: any = { userId: user.userId };

    if (type) {
      query.type = type;
    }

    if (upcoming === "true") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      query.date = { $gte: todayStart };
    } else if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const events = await AcademicEvent.find(query)
      .populate("subjectId", "code name color")
      .sort({ date: 1 });

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error: any) {
    console.error("GET /api/calendar error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/calendar - Add a calendar event
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const body = await req.json();
    const { title, type, date, endDate, subjectId, description, isHoliday } = body;

    if (!title || !type || !date) {
      return NextResponse.json(
        { success: false, message: "Title, event type, and date are required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const event = await AcademicEvent.create({
      userId: user.userId,
      title: title.trim(),
      type,
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : undefined,
      subjectId: subjectId || undefined,
      description: description?.trim() || "",
      isHoliday: isHoliday === true || type === "Holiday",
    });

    const populated = await AcademicEvent.findById(event._id).populate(
      "subjectId",
      "code name color"
    );

    return NextResponse.json({
      success: true,
      message: "Academic event created successfully.",
      event: populated,
    });
  } catch (error: any) {
    console.error("POST /api/calendar error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
