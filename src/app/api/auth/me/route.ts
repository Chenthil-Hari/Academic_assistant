import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) {
      return errorResponse || NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const userDoc = await User.findById(user.userId).select("-passwordHash");
    if (!userDoc) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: userDoc,
    });
  } catch (error: any) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { success: false, message: "Authentication check failed." },
      { status: 500 }
    );
  }
}
