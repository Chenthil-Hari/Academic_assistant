import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { GateSubject } from "@/lib/db/models/GateSubject";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(user.userId);
    const subjectId = new mongoose.Types.ObjectId(params.id);
    const body = await req.json();

    const subject = await GateSubject.findOne({ _id: subjectId, userId: userObjectId });
    if (!subject) {
      return NextResponse.json(
        { success: false, message: "Subject not found." },
        { status: 404 }
      );
    }

    if (body.name !== undefined) subject.name = body.name.trim();
    if (body.code !== undefined) subject.code = body.code.trim().toUpperCase();
    if (body.initialVideos !== undefined) subject.initialVideos = Number(body.initialVideos);
    if (body.remainingVideos !== undefined) {
      subject.remainingVideos = Math.max(0, Number(body.remainingVideos));
      subject.completedVideos = Math.max(0, subject.initialVideos - subject.remainingVideos);
    }
    if (body.completedVideos !== undefined) {
      subject.completedVideos = Math.max(0, Number(body.completedVideos));
      subject.remainingVideos = Math.max(0, subject.initialVideos - subject.completedVideos);
    }
    if (body.averageVideoDuration !== undefined) {
      subject.averageVideoDuration = Math.max(0.1, Number(body.averageVideoDuration));
    }
    if (body.priority !== undefined) subject.priority = body.priority;
    if (body.priorityOrder !== undefined) subject.priorityOrder = Number(body.priorityOrder);
    if (body.color !== undefined) subject.color = body.color;
    if (body.status !== undefined) subject.status = body.status;
    if (body.notes !== undefined) subject.notes = body.notes;

    if (subject.remainingVideos === 0) {
      subject.status = "Completed";
    }

    await subject.save();

    return NextResponse.json({
      success: true,
      subject,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(user.userId);
    const subjectId = new mongoose.Types.ObjectId(params.id);

    const deleted = await GateSubject.findOneAndDelete({ _id: subjectId, userId: userObjectId });
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Subject not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Subject removed successfully.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
