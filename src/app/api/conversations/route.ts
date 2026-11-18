import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { Conversation } from "@/lib/db/models/Conversation";

export const dynamic = "force-dynamic";

// GET /api/conversations - List conversations for user
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const conversations = await Conversation.find({ userId: user.userId })
      .select("title createdAt updatedAt messages")
      .sort({ updatedAt: -1 })
      .limit(20);

    const formatted = conversations.map((c) => ({
      id: c._id,
      title: c.title,
      messageCount: c.messages.length,
      lastMessage: c.messages[c.messages.length - 1]?.content.slice(0, 80) || "",
      updatedAt: c.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      conversations: formatted,
    });
  } catch (error: any) {
    console.error("GET /api/conversations error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/conversations - Create fresh conversation
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const { title } = await req.json().catch(() => ({ title: "New Academic Chat" }));

    await connectToDatabase();
    const conversation = await Conversation.create({
      userId: user.userId,
      title: title || "New Academic Chat",
      messages: [],
    });

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation._id,
        title: conversation.title,
        messages: [],
      },
    });
  } catch (error: any) {
    console.error("POST /api/conversations error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
