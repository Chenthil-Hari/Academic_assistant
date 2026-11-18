import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { hashPassword } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Token and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired password reset token." },
        { status: 400 }
      );
    }

    user.passwordHash = await hashPassword(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. Please log in with your new password.",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to reset password." },
      { status: 500 }
    );
  }
}
