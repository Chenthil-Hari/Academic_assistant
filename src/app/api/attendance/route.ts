import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { Attendance } from "@/lib/db/models/Attendance";
import { Subject } from "@/lib/db/models/Subject";
import { ClassSession } from "@/lib/db/models/ClassSession";
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

// POST /api/attendance - Manually mark single or multi-period attendance, including interchanged/proxy classes
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const body = await req.json();
    const {
      subjectId,
      date,
      status,
      notes,
      classSessionId,
      periods = 1,
      classCategory = "Regular",
      periodSlot = "",
    } = body;

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
    const numPeriods = Math.max(1, Math.min(Number(periods || 1), 6));

    let finalNote = notes ? notes.trim() : "";
    if (classCategory === "Interchanged" && !finalNote.toLowerCase().includes("interchanged")) {
      finalNote = `[Interchanged Period] ${finalNote}`.trim();
    } else if (classCategory === "ExtraClass" && !finalNote.toLowerCase().includes("extra")) {
      finalNote = `[Extra Class] ${finalNote}`.trim();
    } else if (classCategory === "Lab" && !finalNote.toLowerCase().includes("lab")) {
      finalNote = `[Lab Session] ${finalNote}`.trim();
    }

    // Standard bell slots for helper start/end times if not specified
    const standardSlots = [
      { start: "08:25", end: "09:15" },
      { start: "09:15", end: "10:05" },
      { start: "10:20", end: "11:10" },
      { start: "11:10", end: "12:00" },
      { start: "12:50", end: "13:40" },
      { start: "13:40", end: "14:30" },
      { start: "14:40", end: "15:20" },
    ];

    const createdRecords = [];

    // Case 1: Updating an existing specific class session
    if (classSessionId) {
      let record = await Attendance.findOne({
        userId: user.userId,
        classSessionId,
      });

      const previousStatus = record ? record.status : null;
      if (record) {
        record.status = status;
        record.notes = finalNote || record.notes;
        record.markedAt = new Date();
        record.source = "manual";
        await record.save();
      } else {
        record = await Attendance.create({
          userId: user.userId,
          subjectId,
          classSessionId,
          date: targetDate,
          status,
          notes: finalNote,
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
        newData: { status, notes: finalNote },
        reason: classCategory === "Interchanged" ? "Faculty absent interchanged period" : "Manual entry by user",
        ipAddress: req.headers.get("x-forwarded-for") || "",
      });

      createdRecords.push(record);
    } else {
      // Case 2: Marking 1 or more periods for ANY subject on ANY day irrespective of timetable
      for (let i = 0; i < numPeriods; i++) {
        let startTime = "";
        let endTime = "";

        if (periodSlot && periodSlot.includes("-")) {
          const parts = periodSlot.split("-").map((s: string) => s.trim());
          startTime = parts[0] || "";
          endTime = parts[1] || "";
        }

        if (!startTime || i > 0) {
          const slotIdx = Math.min(i, standardSlots.length - 1);
          startTime = standardSlots[slotIdx].start;
          endTime = standardSlots[slotIdx].end;
        }

        // Create a dedicated ClassSession for each marked period
        const session = await ClassSession.create({
          userId: user.userId,
          subjectId: subject._id,
          date: targetDate,
          startTime,
          endTime,
          room: "",
          type: classCategory === "ExtraClass" ? "ExtraClass" : classCategory === "Lab" ? "Lab" : "Lecture",
          status: status === "Cancelled" ? "Cancelled" : "Conducted",
          notes: finalNote,
        });

        // Create distinct Attendance record
        const record = await Attendance.create({
          userId: user.userId,
          subjectId: subject._id,
          classSessionId: session._id,
          date: targetDate,
          status,
          notes: numPeriods > 1 ? `${finalNote} (Period ${i + 1}/${numPeriods})`.trim() : finalNote,
          source: "manual",
          markedAt: new Date(),
        });

        await createAuditLog({
          userId: user.userId,
          action: "ATTENDANCE_MANUAL_CREATED",
          entityType: "Attendance",
          entityId: record._id,
          newData: { status, notes: record.notes, subject: subject.code },
          reason: classCategory === "Interchanged" ? "Faculty absent interchanged period" : "Manual entry irrespective of timetable",
          ipAddress: req.headers.get("x-forwarded-for") || "",
        });

        createdRecords.push(record);
      }
    }

    const firstRecord = await Attendance.findById(createdRecords[0]._id)
      .populate("subjectId", "code name color")
      .populate("classSessionId", "startTime endTime room type");

    return NextResponse.json({
      success: true,
      message: `Successfully marked ${createdRecords.length} period(s) of ${subject.code} as ${status} on ${targetDate.toISOString().split("T")[0]}.`,
      record: firstRecord,
      recordsCount: createdRecords.length,
    });
  } catch (error: any) {
    console.error("POST /api/attendance error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
