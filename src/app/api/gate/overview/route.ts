import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { GateSubject } from "@/lib/db/models/GateSubject";
import { GateUserSettings } from "@/lib/db/models/GateUserSettings";
import { GateProgress } from "@/lib/db/models/GateProgress";
import { calculateGateWorkload, INITIAL_GATE_SUBJECTS } from "@/lib/gate/calculations";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(user.userId);

    // Auto-seed Hari's personal GATE 2027 subjects ONLY for Hari's account
    // Other users start with a clean customizable planner
    let count = await GateSubject.countDocuments({ userId: userObjectId });
    if (count === 0 && user.email?.toLowerCase() === "chenthilhari@gmail.com") {
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

    let settings = await GateUserSettings.findOne({ userId: userObjectId });
    if (!settings) {
      const isHari = user.email?.toLowerCase() === "chenthilhari@gmail.com";
      settings = await GateUserSettings.create({
        userId: userObjectId,
        examType: isHari ? "GATE CS" : "GATE",
        examLabel: isHari ? "GATE 2027" : "Exam 2027",
        targetYear: 2027,
        targetScore: 65,
        studyStyle: isHari ? "videos" : "topics",
        dailyStudyHours: isHari ? 10 : 6,
        studyDaysPerWeek: 6,
        restDayOfWeek: 0,
        phase1Deadline: new Date("2026-12-31T23:59:59.999Z"),
        pyqStartDate: new Date("2027-01-01T00:00:00.000Z"),
        currentPhase: "Phase 1 - Lectures & Concept",
        playbackSpeed: 1.0,
      });
    }

    const subjects = await GateSubject.find({ userId: userObjectId }).sort({ priorityOrder: 1 });

    const workload = calculateGateWorkload({
      subjects,
      deadline: settings.phase1Deadline,
      gateExamDate: settings.gateExamDate || new Date("2027-02-06T09:00:00.000Z"),
      dailyStudyHours: settings.dailyStudyHours || 10,
      studyDaysPerWeek: settings.studyDaysPerWeek || 6,
      playbackSpeed: settings.playbackSpeed || 1.0,
    });

    // Today's logged progress
    const istOffset = 5.5 * 60 * 60 * 1000;
    const todayIst = new Date(Date.now() + istOffset);
    const startOfDay = new Date(todayIst);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(todayIst);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const todayProgress = await GateProgress.find({
      userId: userObjectId,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).populate("subjectId", "name code color");

    const todayHoursStudied = todayProgress.reduce((sum, p) => sum + (p.hoursStudied || 0), 0);
    const todayVideosCompleted = todayProgress.reduce((sum, p) => sum + (p.videosCompleted || 0), 0);

    // Auto-detect phase transition
    const isPastDeadline = Date.now() > settings.phase1Deadline.getTime();
    const effectivePhase = isPastDeadline ? "Phase 2 - PYQ Practice" : settings.currentPhase;

    return NextResponse.json({
      success: true,
      workload,
      settings: {
        ...settings.toObject(),
        currentPhase: effectivePhase,
      },
      todayStats: {
        hoursStudied: todayHoursStudied,
        videosCompleted: todayVideosCompleted,
        loggedSessionsCount: todayProgress.length,
        logs: todayProgress,
      },
    });
  } catch (error: any) {
    console.error("GATE overview error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
