import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { sendTelegramAlert } from "@/lib/notifications/telegram";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();

    const body = await req.json().catch(() => ({}));
    const chatId = (body.chatId || "").trim();

    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          message: "TELEGRAM_BOT_TOKEN is not set in environment variables. Please add it to your .env.local and Vercel settings.",
        },
        { status: 400 }
      );
    }

    if (!chatId) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid Telegram numeric Chat ID." },
        { status: 400 }
      );
    }

    const testMessage = `🎉 *Academic AI Connected!* 🚀\n\nHello *${user.email || "Hari"}*,\nYour Telegram alerts are successfully configured!\nYou will receive your daily 4:00 PM attendance check-ins, class schedules, and critical bunk warnings here.\n\n👉 [Open Academic AI](https://hari07.tech)`;

    const delivered = await sendTelegramAlert(chatId, testMessage);

    if (delivered) {
      return NextResponse.json({
        success: true,
        message: "Test message sent successfully! Check your Telegram app.",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to send Telegram message. Please ensure you sent /start to your bot first and that your Chat ID is correct.",
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error("Test Telegram error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
