import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { Conversation } from "@/lib/db/models/Conversation";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const conversation = await Conversation.findOne({
      _id: params.id,
      userId: user.userId,
    });

    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error: any) {
    console.error("GET /api/conversations/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const conversation = await Conversation.findOneAndDelete({
      _id: params.id,
      userId: user.userId,
    });

    if (!conversation) {
      return NextResponse.json({ success: false, message: "Conversation not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Conversation deleted.",
    });
  } catch (error: any) {
    console.error("DELETE /api/conversations/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
