import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { GateProgress } from "@/lib/db/models/GateProgress";
import { GateSubject } from "@/lib/db/models/GateSubject";
import { createAuditLog } from "@/lib/db/audit";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(user.userId);

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "30", 10);
    const subjectId = url.searchParams.get("subjectId");

    const query: any = { userId: userObjectId };
    if (subjectId) {
      query.subjectId = new mongoose.Types.ObjectId(subjectId);
    }

    const logs = await GateProgress.find(query)
      .populate("subjectId", "name code color averageVideoDuration priority")
      .sort({ date: -1, createdAt: -1 })
      .limit(limit);

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
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

    const { subjectId, date, videosCompleted, hoursStudied, topicsCovered, notes } = body;

    if (!subjectId) {
      return NextResponse.json(
        { success: false, message: "subjectId is required." },
        { status: 400 }
      );
    }

    const subObjectId = new mongoose.Types.ObjectId(subjectId);
    const subject = await GateSubject.findOne({ _id: subObjectId, userId: userObjectId });
    if (!subject) {
      return NextResponse.json(
        { success: false, message: "Subject not found." },
        { status: 404 }
      );
    }

    const vCompleted = Math.max(0, Number(videosCompleted) || 1);
    const hStudied = Math.max(0.1, Number(hoursStudied) || (vCompleted * subject.averageVideoDuration));

    const progressDoc = await GateProgress.create({
      userId: userObjectId,
      subjectId: subObjectId,
      date: date ? new Date(date) : new Date(),
      videosCompleted: vCompleted,
      hoursStudied: hStudied,
      topicsCovered: topicsCovered || "GATE lecture study session",
      notes: notes || "",
      status: "Completed",
    });

    // Update GateSubject remaining & completed counts
    subject.remainingVideos = Math.max(0, subject.remainingVideos - vCompleted);
    subject.completedVideos = (subject.completedVideos || 0) + vCompleted;
    if (subject.remainingVideos === 0) {
      subject.status = "Completed";
    } else {
      subject.status = "In Progress";
    }
    await subject.save();

    // Log audit trail
    await createAuditLog({
      userId: userObjectId,
      action: "GATE_STUDY_PROGRESS_LOGGED",
      entityType: "Attendance",
      entityId: progressDoc._id,
      newData: {
        subject: subject.name,
        videosCompleted: vCompleted,
        hoursStudied: hStudied,
        remainingVideos: subject.remainingVideos,
      },
      reason: `Logged ${vCompleted} completed videos in ${subject.name}`,
    });

    return NextResponse.json({
      success: true,
      message: `Progress recorded! ${vCompleted} video(s) deducted from ${subject.name}. Remaining: ${subject.remainingVideos}.`,
      progress: progressDoc,
      updatedSubject: subject,
    });
  } catch (error: any) {
    console.error("GATE progress error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
