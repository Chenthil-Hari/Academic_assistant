import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { GatePYQProgress } from "@/lib/db/models/GatePYQProgress";
import { GateSubject } from "@/lib/db/models/GateSubject";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(user.userId);

    const url = new URL(req.url);
    const subjectId = url.searchParams.get("subjectId");
    const query: any = { userId: userObjectId };
    if (subjectId) {
      query.subjectId = new mongoose.Types.ObjectId(subjectId);
    }

    const pyqDocs = await GatePYQProgress.find(query)
      .populate("subjectId", "name code color")
      .sort({ date: -1, createdAt: -1 });

    const totalAttempted = pyqDocs.reduce((sum, p) => sum + (p.questionsAttempted || 0), 0);
    const totalCorrect = pyqDocs.reduce((sum, p) => sum + (p.correctAnswers || 0), 0);
    const totalIncorrect = pyqDocs.reduce((sum, p) => sum + (p.incorrectAnswers || 0), 0);
    const overallAccuracy =
      totalAttempted > 0 ? Number(((totalCorrect / totalAttempted) * 100).toFixed(1)) : 0;
    const totalTimeMinutes = pyqDocs.reduce((sum, p) => sum + (p.timeTakenMinutes || 0), 0);

    // Subject-wise accuracy breakdown
    const subjectMap: { [subCode: string]: { name: string; attempted: number; correct: number; color: string } } = {};
    for (const p of pyqDocs) {
      const code = (p.subjectId as any)?.code || "GEN";
      const name = (p.subjectId as any)?.name || "General";
      const color = (p.subjectId as any)?.color || "#3B82F6";
      if (!subjectMap[code]) {
        subjectMap[code] = { name, attempted: 0, correct: 0, color };
      }
      subjectMap[code].attempted += p.questionsAttempted || 0;
      subjectMap[code].correct += p.correctAnswers || 0;
    }

    const subjectBreakdown = Object.entries(subjectMap).map(([code, s]) => ({
      code,
      name: s.name,
      color: s.color,
      questionsAttempted: s.attempted,
      correctAnswers: s.correct,
      accuracyPercentage: s.attempted > 0 ? Number(((s.correct / s.attempted) * 100).toFixed(1)) : 0,
    }));

    return NextResponse.json({
      success: true,
      summary: {
        totalAttempted,
        totalCorrect,
        totalIncorrect,
        overallAccuracy,
        totalTimeMinutes,
        sessionsCount: pyqDocs.length,
      },
      subjectBreakdown,
      logs: pyqDocs,
    });
  } catch (error: any) {
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

    const {
      subjectId,
      topic,
      year,
      questionsAttempted,
      correctAnswers,
      timeTakenMinutes,
      difficulty,
      revisionStatus,
      notes,
    } = body;

    if (!subjectId || !topic) {
      return NextResponse.json(
        { success: false, message: "subjectId and topic are required." },
        { status: 400 }
      );
    }

    const attempted = Math.max(1, Number(questionsAttempted) || 1);
    const correct = Math.max(0, Math.min(attempted, Number(correctAnswers) || 0));
    const incorrect = attempted - correct;
    const accuracy = Number(((correct / attempted) * 100).toFixed(1));

    const pyqEntry = await GatePYQProgress.create({
      userId: userObjectId,
      subjectId: new mongoose.Types.ObjectId(subjectId),
      topic: topic.trim(),
      year: year ? Number(year) : undefined,
      questionsAttempted: attempted,
      correctAnswers: correct,
      incorrectAnswers: incorrect,
      accuracyPercentage: accuracy,
      timeTakenMinutes: Math.max(1, Number(timeTakenMinutes) || 30),
      difficulty: difficulty || "Medium",
      revisionStatus: revisionStatus || "Pending Review",
      date: new Date(),
      notes: notes || "",
    });

    return NextResponse.json({
      success: true,
      entry: pyqEntry,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
