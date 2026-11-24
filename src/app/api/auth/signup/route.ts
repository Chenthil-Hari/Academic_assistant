import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { hashPassword, signToken, setAuthCookie } from "@/lib/auth/jwt";
import {
  sendNewRegistrationAdminNotification,
  sendRegistrationPendingAcknowledgment,
} from "@/lib/email/resend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      college,
      branch,
      semester,
      rollNumber,
      targetAttendancePercentage,
      signupReason,
    } = body;

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

    const trimmedEmail = email.toLowerCase().trim();
    const isAdmin = trimmedEmail === "chenthilhari@gmail.com";

    // Non-admin accounts must provide a reason for wanting an account
    if (!isAdmin && (!signupReason || signupReason.trim().length < 8)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please provide a detailed reason explaining why you want to create an account in Academic AI.",
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            existingUser.status === "pending"
              ? "You already have a pending registration request awaiting administrator review."
              : "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const initialStatus = isAdmin ? "approved" : "pending";
    const initialRole = isAdmin ? "admin" : "student";

    const user = await User.create({
      name: name.trim(),
      email: trimmedEmail,
      passwordHash,
      college: college?.trim() || "",
      branch: branch?.trim() || "",
      semester: semester ? Number(semester) : 1,
      rollNumber: rollNumber?.trim() || "",
      targetAttendancePercentage: targetAttendancePercentage
        ? Number(targetAttendancePercentage)
        : 75,
      role: initialRole,
      status: initialStatus,
      signupReason: signupReason?.trim() || (isAdmin ? "Primary Administrator Account" : ""),
      approvedAt: isAdmin ? new Date() : undefined,
      notificationPreferences: {
        webPush: true,
        telegram: false,
        dailyCheckinTime: "16:00",
        timezone: "Asia/Kolkata",
      },
    });

    // If Admin account: auto-login
    if (isAdmin) {
      const token = signToken({
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
      });

      const response = NextResponse.json({
        success: true,
        message: "Administrator account activated successfully.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      });

      setAuthCookie(response, token);
      return response;
    }

    // For New User: Send automated email notification to Admin & Acknowledgment to Applicant via Resend
    const adminEmail = process.env.ADMIN_EMAIL || "chenthilhari@gmail.com";

    // Trigger async email notifications
    Promise.allSettled([
      sendNewRegistrationAdminNotification(adminEmail, {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        college: user.college,
        branch: user.branch,
        semester: user.semester,
        rollNumber: user.rollNumber,
        signupReason: user.signupReason || "",
        targetAttendance: user.targetAttendancePercentage,
        createdAt: user.createdAt,
      }),
      sendRegistrationPendingAcknowledgment(user.email, user.name),
    ]).catch((err) => {
      console.error("Async email notification error during signup:", err);
    });

    return NextResponse.json({
      success: true,
      pendingApproval: true,
      message:
        "Your registration request has been submitted for administrator review. You will receive an email once your account has been approved.",
      applicant: {
        id: user._id,
        name: user.name,
        email: user.email,
        college: user.college,
        branch: user.branch,
        signupReason: user.signupReason,
      },
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create account." },
      { status: 500 }
    );
  }
}
