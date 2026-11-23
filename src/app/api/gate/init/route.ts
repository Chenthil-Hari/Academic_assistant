import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { GateSubject } from "@/lib/db/models/GateSubject";
import { GateUserSettings } from "@/lib/db/models/GateUserSettings";
import { INITIAL_GATE_SUBJECTS } from "@/lib/gate/calculations";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(user.userId);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "reset") {
      await GateSubject.deleteMany({ userId: userObjectId });
    }

    const existingCount = await GateSubject.countDocuments({ userId: userObjectId });

    if (existingCount === 0) {
      const docsToInsert = INITIAL_GATE_SUBJECTS.map((s) => ({
        userId: userObjectId,
        name: s.name,
        code: s.code,
        initialVideos: s.remainingVideos,
        remainingVideos: s.remainingVideos,
        completedVideos: 0,
        averageVideoDuration: s.averageVideoDuration,
        priority: s.priority,
        priorityOrder: s.priorityOrder,
        color: s.color,
        status: "In Progress",
      }));

      await GateSubject.insertMany(docsToInsert);
    }

    // Ensure settings exist
    let settings = await GateUserSettings.findOne({ userId: userObjectId });
    if (!settings) {
      settings = await GateUserSettings.create({
        userId: userObjectId,
        dailyStudyHours: 10,
        studyDaysPerWeek: 6,
        restDayOfWeek: 0,
        phase1Deadline: new Date("2026-12-31T23:59:59.999Z"),
        pyqStartDate: new Date("2027-01-01T00:00:00.000Z"),
        currentPhase: "Phase 1 - Lectures & Concept",
        playbackSpeed: 1.0,
      });
    }

    const subjects = await GateSubject.find({ userId: userObjectId }).sort({ priorityOrder: 1 });

    return NextResponse.json({
      success: true,
      message: existingCount === 0 ? "Initialized GATE 2027 subjects." : "GATE 2027 subjects already initialized.",
      count: subjects.length,
      settings,
      subjects,
    });
  } catch (error: any) {
    console.error("GATE init error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
