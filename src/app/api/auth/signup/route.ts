import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { hashPassword, signToken, setAuthCookie } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, college, branch, semester, rollNumber, targetAttendancePercentage } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Name, email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      college: college?.trim() || "",
      branch: branch?.trim() || "",
      semester: semester ? Number(semester) : 1,
      rollNumber: rollNumber?.trim() || "",
      targetAttendancePercentage: targetAttendancePercentage ? Number(targetAttendancePercentage) : 75,
      notificationPreferences: {
        webPush: true,
        telegram: false,
        dailyCheckinTime: "16:00",
        timezone: "Asia/Kolkata",
      },
    });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      message: "Account created successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        college: user.college,
        branch: user.branch,
        semester: user.semester,
        rollNumber: user.rollNumber,
        targetAttendancePercentage: user.targetAttendancePercentage,
      },
    });

    setAuthCookie(response, token);
    return response;
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create account." },
      { status: 500 }
    );
  }
}
