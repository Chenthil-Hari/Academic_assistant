import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { Attendance } from "@/lib/db/models/Attendance";
import { ClassSession } from "@/lib/db/models/ClassSession";
import { createAuditLog } from "@/lib/db/audit";
import { getOrCreateDailyCheckin } from "@/lib/attendance/session-generator";
import {
  sendTelegramAlert,
  answerTelegramCallbackQuery,
  editTelegramMessage,
  sendTelegramChatAction,
} from "@/lib/notifications/telegram";
import { processUserMessage } from "@/lib/ai/assistant-service";
import { Conversation } from "@/lib/db/models/Conversation";

export const dynamic = "force-dynamic";

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

// POST /api/telegram/webhook - Pure notification & check-in callback handler (No AI Assistant)
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

        let user = await User.findOne({ telegramChatId: chatId });
        if (!user) {
          user = await User.findOne({ email: "chenthilhari@gmail.com" });
        }

        if (!user) {
          await answerTelegramCallbackQuery(cq.id, "User account not linked.", true);
          return NextResponse.json({ ok: true });
        }

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

          await answerTelegramCallbackQuery(
            cq.id,
            `🎉 All ${updatedCount} classes marked as Attended!`,
            false
          );

          if (messageId) {
            const classSummary = checkin.items
              .map((i) => `✅ ${i.subjectCode}: *Attended*`)
              .join("\n");

            const updatedMsg = `✅ *Daily Attendance Confirmed!*\n\n${classSummary}\n\n🎉 Great job keeping up with your attendance! Audit record logged.`;
            await editTelegramMessage(chatId, messageId, updatedMsg);
          }
        } else {
          await answerTelegramCallbackQuery(cq.id, "No scheduled classes found for this date.", false);
        }

        return NextResponse.json({ ok: true });
      }

      await answerTelegramCallbackQuery(cq.id);
      return NextResponse.json({ ok: true });
    }

    // ─── 2. Handle Text Messages & Commands ───
    if (!body.message) {
      return NextResponse.json({ ok: true });
    }

    const { message } = body;
    const chatId = String(message.chat?.id || "");
    const text = (message.text || "").trim();

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    // Identify or link user
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
      const welcomeMsg = `👋 *Academic AI Assistant*

Hello *${user.name || "Hari"}*! 🎓

I am your personal Academic AI Assistant on Telegram, connected directly to your website account at [hari07.tech](https://hari07.tech).

You can ask me any question about yourself, your academics, and your website records:
• 👤 *Profile & Info*: "What is my roll number?", "Which college & branch am I in?", "Show all my details"
• 📊 *Attendance & Bunks*: "What is my overall attendance?", "Can I bunk Distributed Systems?", "How many classes can I miss?"
• 📅 *Timetable & Schedule*: "What class do I have now?", "What is my schedule today?", "What classes do I have tomorrow?", "Show my weekly timetable"
• 📚 *Subjects & Credits*: "List all my enrolled subjects", "What are my credits and faculty?"
• 🎉 *Exams & Holidays*: "When is Pongal holiday?", "When are upcoming exams?"
• 📑 *Uploaded PDFs*: "What was extracted from my timetable PDF?"
• ⚡ *Check-in*: You will receive 1-tap check-in buttons here after classes!

Go ahead and ask me anything!`;
      await sendTelegramAlert(chatId, welcomeMsg);
      return NextResponse.json({ ok: true });
    }

    // Handle /help command
    if (text === "/help") {
      const helpMsg = `💡 *Academic AI Telegram Help*

Here are some questions you can ask me anytime:
• "Show all my details from the website"
• "What is my roll number and department?"
• "What classes do I have today?"
• "What is my schedule tomorrow?"
• "What is my current attendance?"
• "Can I miss a class in Compiler Design?"
• "What is my lowest attendance subject?"
• "When is the next holiday?"
• "Show my weekly timetable"

Just send your question in plain English and I'll look up your live records immediately!`;
      await sendTelegramAlert(chatId, helpMsg);
      return NextResponse.json({ ok: true });
    }

    // Send typing action so the user sees real-time indicator
    await sendTelegramChatAction(chatId, "typing");

    // Maintain a persistent conversation for Telegram chat
    let telegramConv = await Conversation.findOne({
      userId: user._id,
      title: "Telegram Assistant Chat",
    });

    if (!telegramConv) {
      telegramConv = await Conversation.create({
        userId: user._id,
        title: "Telegram Assistant Chat",
        messages: [],
      });
    }

    // Process user query through the full AI Assistant service
    const aiResult = await processUserMessage({
      userId: user._id.toString(),
      conversationId: telegramConv._id.toString(),
      message: text,
    });

    // Send AI assistant reply back to Telegram
    await sendTelegramAlert(chatId, aiResult.response);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
