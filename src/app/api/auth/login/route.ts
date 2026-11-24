import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { comparePassword, signToken, setAuthCookie } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isAdmin = user.email === "chenthilhari@gmail.com";
    const userRole = user.role || (isAdmin ? "admin" : "student");
    const userStatus = user.status || (isAdmin ? "approved" : "approved");

    // Guard: Check approval status for non-admin accounts
    if (!isAdmin) {
      if (userStatus === "pending") {
        return NextResponse.json(
          {
            success: false,
            pendingApproval: true,
            message:
              "Your account registration request is awaiting administrator approval. You will receive an email once your account has been reviewed.",
          },
          { status: 403 }
        );
      }

      if (userStatus === "rejected") {
        return NextResponse.json(
          {
            success: false,
            rejected: true,
            message: user.rejectionReason
              ? `Your account request was not approved. Note: ${user.rejectionReason}`
              : "Your account registration request was not approved by the administrator.",
          },
          { status: 403 }
        );
      }
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: userRole,
        status: userStatus,
        college: user.college,
        branch: user.branch,
        semester: user.semester,
        rollNumber: user.rollNumber,
        targetAttendancePercentage: user.targetAttendancePercentage,
        notificationPreferences: user.notificationPreferences,
      },
    });

    setAuthCookie(response, token);
    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Login failed." },
      { status: 500 }
    );
  }
}
