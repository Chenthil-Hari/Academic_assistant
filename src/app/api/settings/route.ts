import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const userDoc = await User.findById(user.userId).select("-passwordHash");

    return NextResponse.json({
      success: true,
      user: userDoc,
    });
  } catch (error: any) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const body = await req.json();
    const {
      name,
      college,
      branch,
      semester,
      rollNumber,
      targetAttendancePercentage,
      notificationPreferences,
      telegramChatId,
    } = body;

    await connectToDatabase();
    const userDoc = await User.findById(user.userId);
    if (!userDoc) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    if (name) userDoc.name = name.trim();
    if (college !== undefined) userDoc.college = college.trim();
    if (branch !== undefined) userDoc.branch = branch.trim();
    if (semester !== undefined) userDoc.semester = Number(semester);
    if (rollNumber !== undefined) userDoc.rollNumber = rollNumber.trim();
    if (targetAttendancePercentage !== undefined) {
      userDoc.targetAttendancePercentage = Math.min(100, Math.max(1, Number(targetAttendancePercentage)));
    }
    if (notificationPreferences) {
      userDoc.notificationPreferences = {
        ...userDoc.notificationPreferences,
        ...notificationPreferences,
      };
    }
    if (telegramChatId !== undefined) {
      userDoc.telegramChatId = telegramChatId.trim();
    }

    await userDoc.save();

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully.",
      user: userDoc,
    });
  } catch (error: any) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
