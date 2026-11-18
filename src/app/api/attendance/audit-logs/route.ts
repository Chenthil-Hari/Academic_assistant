import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { AuditLog } from "@/lib/db/models/AuditLog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const logs = await AuditLog.find({ userId: user.userId })
      .sort({ timestamp: -1 })
      .limit(50);

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error: any) {
    console.error("GET /api/attendance/audit-logs error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
