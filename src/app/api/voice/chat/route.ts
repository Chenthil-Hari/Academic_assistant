import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { Conversation } from "@/lib/db/models/Conversation";
import { processUserMessage } from "@/lib/ai/assistant-service";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const body = await req.json();
    const { text, conversationId } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ success: false, message: "Spoken text is required." }, { status: 400 });
    }

    await connectToDatabase();

    // Fetch or create dedicated Jarvis voice conversation
    let activeConvId = conversationId;
    if (!activeConvId) {
      let voiceConv = await Conversation.findOne({
        userId: user.userId,
        title: "Jarvis Voice Call",
      });
      if (!voiceConv) {
        voiceConv = await Conversation.create({
          userId: user.userId,
          title: "Jarvis Voice Call",
          messages: [],
        });
      }
      activeConvId = voiceConv._id.toString();
    }

    // Process spoken query through database-grounded AI tools with phone call voice instruction
    const voicePrompt = `[Spoken voice call from ${user.name || "Student"}]: ${text.trim()}\n(Respond concisely in 1-3 spoken conversational sentences suitable for Text-to-Speech audio, without markdown symbols or bullet points).`;

    const aiResult = await processUserMessage({
      userId: user.userId,
      conversationId: activeConvId,
      message: voicePrompt,
    });

    // Clean up any remaining markdown asterisks or hashes for clean speech audio
    const speechText = (aiResult.response || "I have noted that.")
      .replace(/[*#_`~>]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return NextResponse.json({
      success: true,
      text: speechText,
      conversationId: activeConvId,
      toolCallsMade: aiResult.toolCallsMade || [],
    });
  } catch (error: any) {
    console.error("Voice chat API error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
