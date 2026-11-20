import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { Conversation } from "@/lib/db/models/Conversation";
import { Attendance } from "@/lib/db/models/Attendance";
import { ClassSession } from "@/lib/db/models/ClassSession";
import { createAuditLog } from "@/lib/db/audit";
import { getOrCreateDailyCheckin } from "@/lib/attendance/session-generator";
import { processUserMessage } from "@/lib/ai/assistant-service";
import {
  sendTelegramAlert,
  answerTelegramCallbackQuery,
  editTelegramMessage,
} from "@/lib/notifications/telegram";

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

// POST /api/telegram/webhook - Handles incoming messages and interactive inline button callbacks
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: true });
    }

    await connectToDatabase();

    // ─── 1. Handle Inline Keyboard Callback Queries (e.g. 1-Tap Check-in) ───
    if (body.callback_query) {
      const cq = body.callback_query;
      const data = String(cq.data || "");
      const chatId = String(cq.message?.chat?.id || cq.from?.id || "");
      const messageId = cq.message?.message_id;

      if (data.startsWith("checkin_all_")) {
        const dateStr = data.replace("checkin_all_", "");
        const targetDate = dateStr ? new Date(dateStr) : new Date();

        // Locate user in MongoDB by telegramChatId
        let user = await User.findOne({ telegramChatId: chatId });
        if (!user) {
          user = await User.findOne({ email: "chenthilhari@gmail.com" });
        }

        if (!user) {
          await answerTelegramCallbackQuery(cq.id, "User account not linked.", true);
          return NextResponse.json({ ok: true });
        }

        // Get or generate daily checkin items for this user
        const checkin = await getOrCreateDailyCheckin(user._id, targetDate);

        if (checkin.items && checkin.items.length > 0) {
          let updatedCount = 0;
          for (const item of checkin.items) {
            await Attendance.updateOne(
              { _id: item.attendanceId, userId: user._id },
              {
                $set: {
                  status: "Attended",
                  markedAt: new Date(),
                  source: "telegram_bot",
                },
              }
            );

            if (item.sessionId) {
              await ClassSession.findByIdAndUpdate(item.sessionId, {
                status: "Conducted",
              });
            }
            updatedCount++;
          }

          // Log Audit Trail
          await createAuditLog({
            userId: user._id,
            action: "TELEGRAM_1TAP_CHECKIN_CONFIRMED",
            entityType: "Attendance",
            entityId: user._id,
            newData: { status: "Attended", count: updatedCount },
            reason: "1-Tap 'Mark All Attended' via Telegram Inline Button",
          });

          // Acknowledge callback query with toast alert in Telegram
          await answerTelegramCallbackQuery(
            cq.id,
            `🎉 All ${updatedCount} classes marked as Attended!`,
            false
          );

          // Update the Telegram message to show confirmation checkmark
          if (messageId) {
            const classSummary = checkin.items
              .map((i) => `✅ ${i.subjectCode}: *Attended*`)
              .join("\n");

            const updatedMsg = `✅ *Daily Attendance Confirmed via Telegram!*\n\n${classSummary}\n\n🎉 Great job keeping up with your attendance! Audit record logged.`;
            await editTelegramMessage(chatId, messageId, updatedMsg);
          }
        } else {
          await answerTelegramCallbackQuery(cq.id, "No scheduled classes found for this date.", false);
        }

        return NextResponse.json({ ok: true });
      }

      // Generic acknowledgement for other callback queries
      await answerTelegramCallbackQuery(cq.id);
      return NextResponse.json({ ok: true });
    }

    // ─── 2. Handle Text Messages and Commands ───
    if (!body.message) {
      return NextResponse.json({ ok: true });
    }

    const { message } = body;
    const chatId = String(message.chat?.id || "");
    const text = (message.text || "").trim();

    if (!chatId || !text) {
      return NextResponse.json({ ok: true });
    }

    // Identify User in MongoDB
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

    // Handle /start command
    if (text === "/start") {
      const welcomeMsg = `👋 *Welcome to Academic AI Assistant, ${user.name || "Hari"}!*\n\nI am your personal AI student operating system. You can ask me anything about your academic schedule right here in Telegram!\n\n💡 *Try asking me:*\n• _What is the class now?_\n• _What classes do I have today?_\n• _How is my attendance?_\n• _Can I bunk Software Engineering?_\n• _When is the Pongal holiday?_\n\n👉 [Open Academic AI](https://hari07.tech)`;
      await sendTelegramAlert(chatId, welcomeMsg);
      return NextResponse.json({ ok: true });
    }

    // Send "typing..." action so Telegram UI shows typing indicator
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, action: "typing" }),
      });
    } catch (e) {}

    // Fetch or create dedicated Telegram conversation
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

    // Query AI Assistant Engine with verified database tools
    const result = await processUserMessage({
      userId: user._id.toString(),
      conversationId: conv._id.toString(),
      message: text,
    });

    const replyText = result.response || "I could not retrieve an answer for that.";

    // Deliver response directly to Telegram
    await sendTelegramAlert(chatId, replyText);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
