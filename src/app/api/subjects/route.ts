import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { Subject } from "@/lib/db/models/Subject";

export const dynamic = "force-dynamic";

// GET /api/subjects - List all subjects for authenticated user
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const subjects = await Subject.find({ userId: user.userId }).sort({ code: 1 });

    return NextResponse.json({
      success: true,
      subjects,
    });
  } catch (error: any) {
    console.error("GET /api/subjects error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/subjects - Create a new subject
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const body = await req.json();
    const { code, name, credit, faculty, color, minAttendanceThreshold } = body;

    if (!code || !name) {
      return NextResponse.json(
        { success: false, message: "Subject code and name are required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existing = await Subject.findOne({
      userId: user.userId,
      code: code.trim().toUpperCase(),
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: `Subject code '${code.toUpperCase()}' already exists.` },
        { status: 409 }
      );
    }

    const subject = await Subject.create({
      userId: user.userId,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      credit: credit ? Number(credit) : 3,
      faculty: faculty?.trim() || "",
      color: color || "#3B82F6",
      minAttendanceThreshold: minAttendanceThreshold ? Number(minAttendanceThreshold) : 75,
    });

    return NextResponse.json({
      success: true,
      message: "Subject created successfully.",
      subject,
    });
  } catch (error: any) {
    console.error("POST /api/subjects error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
