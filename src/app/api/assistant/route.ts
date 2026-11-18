import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { processUserMessage } from "@/lib/ai/assistant-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();

    const body = await req.json();
    const { message, conversationId } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, message: "A non-empty message is required." },
        { status: 400 }
      );
    }

    const result = await processUserMessage({
      userId: user.userId,
      conversationId,
      message: message.trim(),
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("AI assistant endpoint error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
