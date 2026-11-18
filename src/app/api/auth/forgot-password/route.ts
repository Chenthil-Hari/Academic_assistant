import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Don't disclose user existence for security
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, password reset instructions have been generated.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, password reset instructions have been generated.",
      // For development/demo convenience, return resetToken in payload when not in strict production email service
      resetToken: process.env.NODE_ENV !== "production" ? resetToken : undefined,
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, message: "Error processing forgot password request." },
      { status: 500 }
    );
  }
}
