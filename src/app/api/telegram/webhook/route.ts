import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { Conversation } from "@/lib/db/models/Conversation";
import { processUserMessage } from "@/lib/ai/assistant-service";
import { sendTelegramAlert } from "@/lib/notifications/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "9007972451:AAF5VHHnHgRyNed_fmmBBreaJKVIbU5WlmA";

// GET /api/telegram/webhook - Check webhook status or set webhook
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "set") {
      const webhookUrl = "https://hari07.tech/api/telegram/webhook";
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
      const data = await res.json();
      return NextResponse.json({ success: true, setWebhookResult: data });
    }

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const data = await res.json();
    return NextResponse.json({ success: true, webhookInfo: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/telegram/webhook - Handles incoming messages from Telegram users
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.message) {
      return NextResponse.json({ ok: true });
    }

    const { message } = body;
    const chatId = String(message.chat?.id || "");
    const text = (message.text || "").trim();

    if (!chatId || !text) {
      return NextResponse.json({ ok: true });
    }

    await connectToDatabase();

    // 1. Identify User in MongoDB
    let user = await User.findOne({ telegramChatId: chatId });
    if (!user) {
      user = await User.findOne({ email: "chenthilhari@gmail.com" });
      if (user) {
        user.telegramChatId = chatId;
        user.notificationPreferences = {
          ...user.notificationPreferences,
          telegram: true,
        };
        await user.save();
      }
    }

    if (!user) {
      await sendTelegramAlert(
        chatId,
        "⚠️ You are not registered with Academic AI yet. Please log in on https://hari07.tech and set your Telegram Chat ID in Settings."
      );
      return NextResponse.json({ ok: true });
    }

    // 2. Handle /start command
    if (text === "/start") {
      const welcomeMsg = `👋 *Welcome to Academic AI Assistant, ${user.name || "Hari"}!*\n\nI am your personal AI student operating system. You can ask me anything about your academic schedule right here in Telegram!\n\n💡 *Try asking me:*\n• _What is the class now?_\n• _What classes do I have today?_\n• _How is my attendance?_\n• _Can I bunk Software Engineering?_\n• _When is the Pongal holiday?_\n\n👉 [Open Academic AI](https://hari07.tech)`;
      await sendTelegramAlert(chatId, welcomeMsg);
      return NextResponse.json({ ok: true });
    }

    // 3. Send "typing..." action so Telegram UI shows typing indicator
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, action: "typing" }),
      });
    } catch (e) {}

    // 4. Fetch or create a dedicated Telegram conversation
    let conv = await Conversation.findOne({
      userId: user._id,
      title: "Telegram Assistant Chat",
    });
    if (!conv) {
      conv = await Conversation.create({
        userId: user._id,
        title: "Telegram Assistant Chat",
        messages: [],
      });
    }

    // 5. Query AI Assistant Engine with verified database tools
    const result = await processUserMessage({
      userId: user._id.toString(),
      conversationId: conv._id.toString(),
      message: text,
    });

    const replyText = result.response || "I could not retrieve an answer for that.";

    // 6. Deliver response directly to Telegram
    await sendTelegramAlert(chatId, replyText);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
