import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { UploadedDocument } from "@/lib/db/models/UploadedDocument";
import { Subject } from "@/lib/db/models/Subject";
import { Timetable } from "@/lib/db/models/Timetable";
import { AcademicEvent } from "@/lib/db/models/AcademicEvent";
import { createAuditLog } from "@/lib/db/audit";

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const body = await req.json();
    const { documentId, subjects, timetableSlots, calendarEvents } = body;

    await connectToDatabase();

    if (documentId) {
      await UploadedDocument.findOneAndUpdate(
        { _id: documentId, userId: user.userId },
        { isVerifiedByUser: true }
      );
    }

    // 1. Save or update Subjects
    const savedSubjectMap = new Map<string, any>(); // code -> subjectDoc

    if (Array.isArray(subjects) && subjects.length > 0) {
      for (const sub of subjects) {
        if (!sub.code || !sub.name) continue;
        const code = sub.code.trim().toUpperCase();

        let subject = await Subject.findOne({ userId: user.userId, code });
        if (subject) {
          subject.name = sub.name.trim();
          if (sub.credit) subject.credit = Number(sub.credit);
          if (sub.faculty) subject.faculty = sub.faculty.trim();
          if (sub.color) subject.color = sub.color;
          await subject.save();
        } else {
          subject = await Subject.create({
            userId: user.userId,
            code,
            name: sub.name.trim(),
            credit: sub.credit ? Number(sub.credit) : 3,
            faculty: sub.faculty?.trim() || "",
            color: sub.color || "#3B82F6",
          });
        }
        savedSubjectMap.set(code, subject);
      }
    }

    // 2. Save Timetable slots
    let slotsAdded = 0;
    if (Array.isArray(timetableSlots) && timetableSlots.length > 0) {
      for (const slot of timetableSlots) {
        if (!slot.startTime || !slot.endTime || slot.dayOfWeek === undefined) continue;

        const code = (slot.subjectCode || "").trim().toUpperCase();
        let subject = savedSubjectMap.get(code);

        if (!subject) {
          // Look up in database
          subject = await Subject.findOne({ userId: user.userId, code });
        }

        if (!subject) {
          // If subject does not exist, create it on the fly
          subject = await Subject.create({
            userId: user.userId,
            code: code || "UNKNOWN",
            name: slot.subjectName || code || "General Class",
            credit: 3,
            color: "#3B82F6",
          });
          savedSubjectMap.set(code, subject);
        }

        // Avoid duplicate slot
        const existingSlot = await Timetable.findOne({
          userId: user.userId,
          dayOfWeek: Number(slot.dayOfWeek),
          "timeSlot.startTime": slot.startTime.trim(),
          subjectId: subject._id,
        });

        if (!existingSlot) {
          await Timetable.create({
            userId: user.userId,
            subjectId: subject._id,
            dayOfWeek: Number(slot.dayOfWeek),
            timeSlot: {
              startTime: slot.startTime.trim(),
              endTime: slot.endTime.trim(),
            },
            room: slot.room?.trim() || "",
            type: slot.type || "Lecture",
            isActive: true,
          });
          slotsAdded++;
        }
      }
    }

    // 3. Save Academic Events (Exams, Assignments, Holidays)
    let eventsAdded = 0;
    if (Array.isArray(calendarEvents) && calendarEvents.length > 0) {
      for (const ev of calendarEvents) {
        if (!ev.title || !ev.date) continue;

        const eventDate = new Date(ev.date);
        if (isNaN(eventDate.getTime())) continue;

        await AcademicEvent.create({
          userId: user.userId,
          title: ev.title.trim(),
          type: ev.type || "Event",
          date: eventDate,
          endDate: ev.endDate ? new Date(ev.endDate) : undefined,
          description: ev.description?.trim() || "",
          isHoliday: ev.isHoliday === true || ev.type === "Holiday",
        });
        eventsAdded++;
      }
    }

    await createAuditLog({
      userId: user.userId,
      action: "ACADEMIC_DATA_IMPORTED_FROM_PDF",
      entityType: "UploadedDocument",
      entityId: documentId || "direct_import",
      newData: {
        subjectsCount: savedSubjectMap.size,
        slotsAdded,
        eventsAdded,
      },
      reason: "User verified and confirmed PDF extraction",
      ipAddress: req.headers.get("x-forwarded-for") || "",
    });

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${savedSubjectMap.size} subject(s), ${slotsAdded} timetable slot(s), and ${eventsAdded} event(s).`,
      savedSubjectsCount: savedSubjectMap.size,
      slotsAdded,
      eventsAdded,
    });
  } catch (error: any) {
    console.error("PDF extraction confirmation error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
