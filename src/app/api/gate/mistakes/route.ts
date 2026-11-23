import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { GateMistake } from "@/lib/db/models/GateMistake";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(user.userId);

    const url = new URL(req.url);
    const filter = url.searchParams.get("filter"); // "all", "pending", "reviewed"

    const query: any = { userId: userObjectId };
    if (filter === "pending") query.isReviewed = false;
    else if (filter === "reviewed") query.isReviewed = true;

    const mistakes = await GateMistake.find(query)
      .populate("subjectId", "name code color")
      .sort({ createdAt: -1 });

    const totalCount = await GateMistake.countDocuments({ userId: userObjectId });
    const pendingCount = await GateMistake.countDocuments({ userId: userObjectId, isReviewed: false });

    return NextResponse.json({
      success: true,
      totalCount,
      pendingCount,
      reviewedCount: totalCount - pendingCount,
      mistakes,
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

    const { subjectId, topic, questionDetails, myMistake, correctConcept, gateYear, tags } = body;

    if (!subjectId || !topic || !myMistake || !correctConcept) {
      return NextResponse.json(
        { success: false, message: "subjectId, topic, myMistake and correctConcept are required." },
        { status: 400 }
      );
    }

    const mistakeDoc = await GateMistake.create({
      userId: userObjectId,
      subjectId: new mongoose.Types.ObjectId(subjectId),
      topic: topic.trim(),
      questionDetails: questionDetails || "",
      myMistake: myMistake.trim(),
      correctConcept: correctConcept.trim(),
      gateYear: gateYear || "",
      isReviewed: false,
      tags: tags || [],
    });

    return NextResponse.json({
      success: true,
      mistake: mistakeDoc,
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

    const { id, isReviewed, myMistake, correctConcept, topic, questionDetails } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "id is required." }, { status: 400 });
    }

    const mistake = await GateMistake.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: userObjectId,
    });

    if (!mistake) {
      return NextResponse.json({ success: false, message: "Mistake not found." }, { status: 404 });
    }

    if (isReviewed !== undefined) {
      mistake.isReviewed = Boolean(isReviewed);
      mistake.reviewedAt = isReviewed ? new Date() : undefined;
    }
    if (myMistake) mistake.myMistake = myMistake;
    if (correctConcept) mistake.correctConcept = correctConcept;
    if (topic) mistake.topic = topic;
    if (questionDetails) mistake.questionDetails = questionDetails;

    await mistake.save();

    return NextResponse.json({
      success: true,
      mistake,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(user.userId);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "id parameter is required." }, { status: 400 });
    }

    await GateMistake.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: userObjectId,
    });

    return NextResponse.json({ success: true, message: "Mistake entry deleted." });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
