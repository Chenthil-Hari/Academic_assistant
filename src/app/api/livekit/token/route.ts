import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { authenticateRequest } from "@/lib/auth/middleware-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL || "wss://assistant-qd6a878t.livekit.cloud";

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: "LiveKit API Key or Secret not configured." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const roomName = searchParams.get("room") || `jarvis-${user.userId}-${Date.now()}`;
    const participantName = user.name || "Student";
    const participantIdentity = user.userId;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName,
      ttl: "1h",
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      success: true,
      token,
      url: livekitUrl,
      roomName,
      identity: participantIdentity,
      participantName,
    });
  } catch (error: any) {
    console.error("LiveKit token generation error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
