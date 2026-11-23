import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { GateSubject } from "@/lib/db/models/GateSubject";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(user.userId);

    const subjects = await GateSubject.find({ userId: userObjectId }).sort({ priorityOrder: 1, name: 1 });

    return NextResponse.json({
      success: true,
      count: subjects.length,
      subjects,
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
      name,
      code,
      initialVideos,
      remainingVideos,
      averageVideoDuration,
      priority,
      priorityOrder,
      color,
    } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, message: "Name and code are required." },
        { status: 400 }
      );
    }

    const initV = Number(initialVideos) || Number(remainingVideos) || 10;
    const remV = Number(remainingVideos) !== undefined ? Number(remainingVideos) : initV;

    const newSubject = await GateSubject.create({
      userId: userObjectId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      initialVideos: initV,
      remainingVideos: remV,
      completedVideos: Math.max(0, initV - remV),
      averageVideoDuration: Number(averageVideoDuration) || 1.5,
      priority: priority || "High",
      priorityOrder: Number(priorityOrder) || 99,
      color: color || "#3B82F6",
      status: remV === 0 ? "Completed" : "In Progress",
    });

    return NextResponse.json({
      success: true,
      subject: newSubject,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
