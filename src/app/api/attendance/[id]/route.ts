import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { Attendance } from "@/lib/db/models/Attendance";
import { createAuditLog } from "@/lib/db/audit";

// PUT /api/attendance/[id] - Update historical attendance record with reason & audit logging
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const body = await req.json();
    const { status, notes, reason } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, message: "New status is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const record = await Attendance.findOne({ _id: params.id, userId: user.userId });
    if (!record) {
      return NextResponse.json({ success: false, message: "Attendance record not found." }, { status: 404 });
    }

    const previousData = {
      status: record.status,
      notes: record.notes,
      markedAt: record.markedAt,
    };

    record.status = status;
    if (notes !== undefined) record.notes = notes;
    record.markedAt = new Date();
    await record.save();

    // Log the historical change in AuditLog
    await createAuditLog({
      userId: user.userId,
      action: "ATTENDANCE_HISTORICAL_EDITED",
      entityType: "Attendance",
      entityId: record._id,
      previousData,
      newData: { status, notes },
      reason: reason || "User edited historical record",
      ipAddress: req.headers.get("x-forwarded-for") || "",
    });

    const populated = await Attendance.findById(record._id)
      .populate("subjectId", "code name color")
      .populate("classSessionId", "startTime endTime room type");

    return NextResponse.json({
      success: true,
      message: "Attendance updated and change logged in audit history.",
      record: populated,
    });
  } catch (error: any) {
    console.error("PUT /api/attendance/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE /api/attendance/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();

    const record = await Attendance.findOneAndDelete({ _id: params.id, userId: user.userId });
    if (!record) {
      return NextResponse.json({ success: false, message: "Attendance record not found." }, { status: 404 });
    }

    await createAuditLog({
      userId: user.userId,
      action: "ATTENDANCE_RECORD_DELETED",
      entityType: "Attendance",
      entityId: params.id,
      previousData: record.toObject(),
      reason: "User deleted record",
      ipAddress: req.headers.get("x-forwarded-for") || "",
    });

    return NextResponse.json({
      success: true,
      message: "Attendance record deleted.",
    });
  } catch (error: any) {
    console.error("DELETE /api/attendance/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
