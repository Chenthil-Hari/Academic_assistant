import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { GateSubject } from "@/lib/db/models/GateSubject";
import { GateUserSettings } from "@/lib/db/models/GateUserSettings";
import { GateStudySession } from "@/lib/db/models/GateStudySession";
import { generateGateSchedule, rescheduleMissedHours } from "@/lib/gate/scheduler";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(user.userId);

    const url = new URL(req.url);
    const daysParam = parseInt(url.searchParams.get("days") || "14", 10);
    const startDateParam = url.searchParams.get("startDate");
    const startDate = startDateParam ? new Date(startDateParam) : new Date();

    const [subjects, settings] = await Promise.all([
      GateSubject.find({ userId: userObjectId }).sort({ priorityOrder: 1 }),
      GateUserSettings.findOne({ userId: userObjectId }),
    ]);

    const generatedDays = generateGateSchedule({
      subjects,
      startDate,
      daysToGenerate: Math.min(30, Math.max(1, daysParam)),
      dailyStudyHours: settings?.dailyStudyHours || 10,
      deadline: settings?.phase1Deadline,
    });

    // Check for any persisted sessions or completions for this window
    const endDate = new Date(startDate.getTime() + daysParam * 24 * 60 * 60 * 1000);
    const savedSessions = await GateStudySession.find({
      userId: userObjectId,
      date: { $gte: startDate, $lte: endDate },
    }).populate("subjectId", "name code color");

    return NextResponse.json({
      success: true,
      startDate: startDate.toISOString().split("T")[0],
      daysCount: generatedDays.length,
      days: generatedDays,
      savedSessions,
    });
  } catch (error: any) {
    console.error("GATE schedule error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(user.userId);
    const body = await req.json();

    const { action } = body;

    if (action === "reschedule_missed") {
      const { missedHours, subjectId } = body;
      const subjects = await GateSubject.find({ userId: userObjectId }).sort({ priorityOrder: 1 });
      const settings = await GateUserSettings.findOne({ userId: userObjectId });

      const upcoming = generateGateSchedule({
        subjects,
        startDate: new Date(),
        daysToGenerate: 14,
        dailyStudyHours: settings?.dailyStudyHours || 10,
      });

      const rescheduledDays = rescheduleMissedHours({
        missedHours: Number(missedHours) || 2.0,
        missedSubjectId: subjectId,
        upcomingDays: upcoming,
        maxDailyHours: settings?.dailyStudyHours || 10,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully rescheduled ${missedHours || 2} missed hours into upcoming study buffers without exceeding your 10h/day limit.`,
        days: rescheduledDays,
      });
    }

    // Default: Log or save a scheduled session
    const {
      subjectId,
      date,
      dayName,
      timeSlot,
      plannedHours,
      actualHours,
      plannedVideos,
      actualVideos,
      sessionType,
      status,
      topicsCovered,
      notes,
    } = body;

    const session = await GateStudySession.create({
      userId: userObjectId,
      subjectId: subjectId ? new mongoose.Types.ObjectId(subjectId) : undefined,
      date: date ? new Date(date) : new Date(),
      dayName: dayName || "",
      timeSlot: timeSlot || "",
      plannedHours: Number(plannedHours) || 0,
      actualHours: Number(actualHours) || 0,
      plannedVideos: Number(plannedVideos) || 0,
      actualVideos: Number(actualVideos) || 0,
      sessionType: sessionType || "Lecture",
      status: status || "Scheduled",
      topicsCovered: topicsCovered || "",
      notes: notes || "",
    });

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
