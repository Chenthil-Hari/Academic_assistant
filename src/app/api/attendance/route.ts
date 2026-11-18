import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { Attendance } from "@/lib/db/models/Attendance";
import { Subject } from "@/lib/db/models/Subject";
import { createAuditLog } from "@/lib/db/audit";
import { normalizeDate } from "@/lib/attendance/session-generator";

export const dynamic = "force-dynamic";

// GET /api/attendance - List attendance records with optional subject or date filtering
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = Math.min(Number(searchParams.get("limit") || 100), 500);

    const query: any = { userId: user.userId };

    if (subjectId) {
      query.subjectId = subjectId;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(query)
      .populate("subjectId", "code name color")
      .populate("classSessionId", "startTime endTime room type status")
      .sort({ date: -1, markedAt: -1 })
      .limit(limit);

    return NextResponse.json({
      success: true,
      records,
    });
  } catch (error: any) {
    console.error("GET /api/attendance error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/attendance - Manually mark single attendance or extra class session
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const body = await req.json();
    const { subjectId, date, status, notes, classSessionId } = body;

    if (!subjectId || !date || !status) {
      return NextResponse.json(
        { success: false, message: "Subject, date, and status are required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const subject = await Subject.findOne({ _id: subjectId, userId: user.userId });
    if (!subject) {
      return NextResponse.json({ success: false, message: "Subject not found." }, { status: 404 });
    }

    const targetDate = normalizeDate(new Date(date));

    // Prevent double counting: check existing record
    const filter: any = {
      userId: user.userId,
      subjectId,
      date: targetDate,
    };
    if (classSessionId) {
      filter.classSessionId = classSessionId;
    }

    let record = await Attendance.findOne(filter);
    const previousStatus = record ? record.status : null;

    if (record) {
      record.status = status;
      record.notes = notes || record.notes;
      record.markedAt = new Date();
      record.source = "manual";
      await record.save();
    } else {
      record = await Attendance.create({
        userId: user.userId,
        subjectId,
        classSessionId: classSessionId || undefined,
        date: targetDate,
        status,
        notes: notes || "",
        source: "manual",
        markedAt: new Date(),
      });
    }

    await createAuditLog({
      userId: user.userId,
      action: previousStatus ? "ATTENDANCE_MANUAL_UPDATED" : "ATTENDANCE_MANUAL_CREATED",
      entityType: "Attendance",
      entityId: record._id,
      previousData: { status: previousStatus },
      newData: { status, notes },
      reason: "Manual entry by user",
      ipAddress: req.headers.get("x-forwarded-for") || "",
    });

    const populated = await Attendance.findById(record._id)
      .populate("subjectId", "code name color")
      .populate("classSessionId", "startTime endTime room type");

    return NextResponse.json({
      success: true,
      message: "Attendance recorded successfully.",
      record: populated,
    });
  } catch (error: any) {
    console.error("POST /api/attendance error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
