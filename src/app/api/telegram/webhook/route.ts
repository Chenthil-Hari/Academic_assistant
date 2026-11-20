import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { Conversation } from "@/lib/db/models/Conversation";
import { Attendance } from "@/lib/db/models/Attendance";
import { ClassSession } from "@/lib/db/models/ClassSession";
import { createAuditLog } from "@/lib/db/audit";
import { getOrCreateDailyCheckin } from "@/lib/attendance/session-generator";
import { processUserMessage, transcribeAudioBuffer } from "@/lib/ai/assistant-service";
import {
  sendTelegramAlert,
  answerTelegramCallbackQuery,
  editTelegramMessage,
  downloadTelegramFile,
  sendTelegramVoice,
  generateTtsAudio,
  AVAILABLE_VOICES,
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

      // Handle Voice Change Selection via Inline Buttons
      if (cq.data?.startsWith("voice_set:")) {
        const voiceKey = cq.data.split(":")[1];
        const voiceInfo = AVAILABLE_VOICES[voiceKey];
        if (voiceInfo) {
          let user = await User.findOne({ telegramChatId: chatId });
          if (!user) user = await User.findOne({ email: "chenthilhari@gmail.com" });
          if (user) {
            user.assistantVoice = voiceInfo.id;
            await user.save();

            await answerTelegramCallbackQuery(cq.id, `🎙️ Voice changed to ${voiceInfo.name}!`, false);

            if (messageId) {
              await editTelegramMessage(
                chatId,
                messageId,
                `✅ *Voice Changed Successfully!*\n\nYour Academic AI assistant is now using **${voiceInfo.flag} ${voiceInfo.name}**.\n\nSend a voice note anytime to listen!`
              );
            }

            // Send brief voice note sample
            try {
              const sample = await generateTtsAudio(
                `Hello ${user.name || "Hari"}! I am ${voiceInfo.name}. Your Academic AI voice notes will now be spoken in my voice!`,
                voiceInfo.id
              );
              if (sample) {
                await sendTelegramVoice(chatId, sample, `🎙️ *Voice Sample:* ${voiceInfo.name}`);
              }
            } catch (err) {}

            return NextResponse.json({ ok: true });
          }
        }
      }

      // Generic acknowledgement for other callback queries
      await answerTelegramCallbackQuery(cq.id);
      return NextResponse.json({ ok: true });
    }

    // ─── 2. Handle Text Messages, Commands, and Voice Notes ───
    if (!body.message) {
      return NextResponse.json({ ok: true });
    }

    const { message } = body;
    const chatId = String(message.chat?.id || "");
    const voiceObj = message.voice || message.audio;
    let text = (message.text || "").trim();

    if (!chatId || (!text && !voiceObj)) {
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

    // ─── If Incoming Message is a Voice Note (.ogg / .mp3) ───
    const isVoiceMessage = Boolean(voiceObj && voiceObj.file_id);
    if (isVoiceMessage) {
      try {
        // Send "record_voice" typing action
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, action: "record_voice" }),
        });

        // 1. Download voice note file from Telegram
        const downloaded = await downloadTelegramFile(voiceObj.file_id);
        if (downloaded) {
          // 2. Transcribe voice note using Google Gemini
          text = await transcribeAudioBuffer(downloaded.buffer, downloaded.mimeType);
        }
      } catch (voiceErr: any) {
        console.error("Voice note transcription error:", voiceErr);
        await sendTelegramAlert(chatId, "⚠️ Could not transcribe your voice note. Please try speaking again or send text.");
        return NextResponse.json({ ok: true });
      }
    }

    if (!text) {
      await sendTelegramAlert(chatId, "⚠️ Could not hear any speech in your voice note. Please try again.");
      return NextResponse.json({ ok: true });
    }

    // Handle /voice command
    if (text === "/voice" || text === "/voices") {
      const currentVoice = user.assistantVoice || "en-IN-NeerjaNeural";
      const keyboard = Object.entries(AVAILABLE_VOICES).map(([key, v]) => [
        {
          text: `${v.id === currentVoice ? "🟢 " : ""}${v.flag} ${v.name}`,
          callback_data: `voice_set:${key}`,
        },
      ]);

      await sendTelegramAlert(
        chatId,
        `🎙️ *Choose Your Academic AI Speaking Voice*\n\nYour current voice is: *${
          Object.values(AVAILABLE_VOICES).find((v) => v.id === currentVoice)?.name || "Neerja (Indian Female)"
        }*\n\nTap any voice below to switch:`,
        { inline_keyboard: keyboard }
      );
      return NextResponse.json({ ok: true });
    }

    // Handle /start command
    if (text === "/start") {
      const welcomeMsg = `👋 *Welcome to Academic AI Voice & Text Assistant, ${user.name || "Hari"}!*\n\nI am your personal AI student operating system. You can ask me anything about your academic schedule by text OR by holding the 🎙️ **Voice Note** button!\n\n🎙️ *Voice Customization:*\n• Type /voice to pick your favorite speaking voice (e.g. 🇮🇳 Neerja, 🇬🇧 Jarvis, 🇺🇸 Christopher)\n\n💡 *Try asking me by voice or text:*\n• _"What is the class now?"_\n• _"What classes do I have today?"_\n• _"How is my attendance in DBMS?"_\n• _"Can I bunk Computer Networks?"_\n• _"When is my next exam?"_\n\n👉 [Open Academic AI](https://hari07.tech)`;
      await sendTelegramAlert(chatId, welcomeMsg);
      return NextResponse.json({ ok: true });
    }

    // Send "typing..." action so Telegram UI shows action indicator
    try {
      const actionType = isVoiceMessage ? "record_voice" : "typing";
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, action: actionType }),
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

    // ─── If User Sent a Voice Note: Reply with Spoken Voice Note + Caption ───
    if (isVoiceMessage) {
      try {
        const userVoice = user.assistantVoice || "en-IN-NeerjaNeural";
        const spokenAudioBuffer = await generateTtsAudio(replyText, userVoice);
        if (spokenAudioBuffer) {
          const caption = `🎙️ *Academic AI:* ${replyText}\n\n*(Transcribed: "${text}")*`;
          const sent = await sendTelegramVoice(chatId, spokenAudioBuffer, caption);
          if (sent) {
            return NextResponse.json({ ok: true });
          }
        }
      } catch (ttsErr) {
        console.error("Telegram voice note generation error:", ttsErr);
      }
    }

    // Standard text delivery fallback
    await sendTelegramAlert(chatId, replyText);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
