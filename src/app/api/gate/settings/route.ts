import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { GateUserSettings } from "@/lib/db/models/GateUserSettings";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(user.userId);

    let settings = await GateUserSettings.findOne({ userId: userObjectId });
    if (!settings) {
      settings = await GateUserSettings.create({
        userId: userObjectId,
        examType: "GATE CS",
        examLabel: "GATE 2027",
        targetYear: 2027,
        targetScore: 65,
        dailyStudyHours: 10,
        studyDaysPerWeek: 6,
        restDayOfWeek: 0,
        phase1Deadline: new Date("2026-12-31T23:59:59.999Z"),
        pyqStartDate: new Date("2027-01-01T00:00:00.000Z"),
        currentPhase: "Phase 1 - Lectures & Concept",
        playbackSpeed: 1.0,
      });
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(user.userId);
    const body = await req.json();

    let settings = await GateUserSettings.findOne({ userId: userObjectId });
    if (!settings) {
      settings = new GateUserSettings({ userId: userObjectId });
    }

    if (body.examType !== undefined) settings.examType = body.examType;
    if (body.examLabel !== undefined) settings.examLabel = body.examLabel;
    if (body.targetYear !== undefined) settings.targetYear = Math.max(2024, Math.min(2035, Number(body.targetYear)));
    if (body.targetScore !== undefined) settings.targetScore = Math.max(1, Math.min(100, Number(body.targetScore)));
    if (body.dailyStudyHours !== undefined) {
      settings.dailyStudyHours = Math.max(1, Math.min(20, Number(body.dailyStudyHours)));
    }
    if (body.studyDaysPerWeek !== undefined) {
      settings.studyDaysPerWeek = Math.max(1, Math.min(7, Number(body.studyDaysPerWeek)));
    }
    if (body.phase1Deadline) {
      settings.phase1Deadline = new Date(body.phase1Deadline);
    }
    if (body.pyqStartDate) {
      settings.pyqStartDate = new Date(body.pyqStartDate);
    }
    if (body.gateExamDate) {
      settings.gateExamDate = new Date(body.gateExamDate);
    }
    if (body.currentPhase) {
      settings.currentPhase = body.currentPhase;
    }
    if (body.playbackSpeed !== undefined) {
      settings.playbackSpeed = Math.max(0.5, Math.min(3.0, Number(body.playbackSpeed)));
    }

    await settings.save();

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
