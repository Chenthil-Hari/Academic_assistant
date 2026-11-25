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
          await answerTelegramCallbackQuery(cq.id, "Account not linked. Send /link TOKEN in this chat.", true);
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

      // Handle GATE 1-tap progress logging callbacks
      if (data.startsWith("gate_log_")) {
        const hours = Number(data.replace("gate_log_", "")) || 10;
        let user = await User.findOne({ telegramChatId: chatId });
        if (!user) {
          await answerTelegramCallbackQuery(cq.id, "Account not linked. Send /link TOKEN in this chat.", true);
          return NextResponse.json({ ok: true });
        }

        const { GateSubject } = await import("@/lib/db/models/GateSubject");
        const { GateProgress } = await import("@/lib/db/models/GateProgress");

        let activeSubject = await GateSubject.findOne({
          userId: user._id,
          remainingVideos: { $gt: 0 },
        }).sort({ priorityOrder: 1 });

        const avgDuration = activeSubject?.averageVideoDuration || 1.5;
        const videosToDeduct = Math.max(1, Math.round(hours / avgDuration));

        if (activeSubject) {
          const actualDeduct = Math.min(activeSubject.remainingVideos, videosToDeduct);
          activeSubject.remainingVideos = Math.max(0, activeSubject.remainingVideos - actualDeduct);
          activeSubject.completedVideos = (activeSubject.completedVideos || 0) + actualDeduct;
          if (activeSubject.remainingVideos === 0) activeSubject.status = "Completed";
          await activeSubject.save();

          await GateProgress.create({
            userId: user._id,
            subjectId: activeSubject._id,
            date: new Date(),
            videosCompleted: actualDeduct,
            hoursStudied: hours,
            topicsCovered: `Telegram 1-Tap Daily Check-in (${hours}h)`,
            notes: "Logged directly via Telegram 1-tap interactive button",
            completionStatus: "Completed",
          });
        }

        await answerTelegramCallbackQuery(cq.id, `🎉 ${hours} Hours Logged in GATE Planner!`, false);

        if (messageId) {
          const updatedMsg = `✅ *Study Session Confirmed!*\n\n• **Hours Logged Today:** **${hours} Hours**\n• **Subject Progressed:** ${activeSubject ? activeSubject.name : "High-Priority Subject"}\n• **Units Completed:** ${videosToDeduct}\n\n🎉 Outstanding discipline, ${user.name || "Student"}! Keep up the great consistency! 🚀`;
          await editTelegramMessage(chatId, messageId, updatedMsg);
        }

        return NextResponse.json({ ok: true });
      }

      if (data === "gate_reschedule_prompt") {
        await answerTelegramCallbackQuery(cq.id, "Reply with /reschedule 2", false);
        await sendTelegramAlert(
          chatId,
          `⚠️ *Rescheduling Study Sessions*\n\nDon't worry about missed hours! To roll forward your unfinished study hours without breaking your 10h/day cap, simply reply:\n\n👉 \`/reschedule 2\` (or any number of hours)\n\nOur intelligent scheduling engine will allocate buffer slots automatically!`
        );
        return NextResponse.json({ ok: true });
      }

      if (data === "gate_refresh_motivation") {
        const { GATE_MOTIVATION_QUOTES } = await import("@/lib/gate/calculations");
        const randomQuote = GATE_MOTIVATION_QUOTES[Math.floor(Math.random() * GATE_MOTIVATION_QUOTES.length)];
        await answerTelegramCallbackQuery(cq.id, "Here is your fresh motivation!", false);
        await sendTelegramAlert(
          chatId,
          `💡 *Fresh GATE Mindset Quote (${randomQuote.tag})*\n\n> _"${randomQuote.quote}"_\n> — *${randomQuote.author}*\n\n⚡ *Action Tip:* ${randomQuote.actionTip}`
        );
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

    // Identify or link user — ONLY by telegramChatId (never auto-assign to Hari)
    let user = await User.findOne({ telegramChatId: chatId });

    // Handle /link TOKEN command — link this chat to the user who generated the token
    if (!user && text.toLowerCase().startsWith("/link ")) {
      const token = text.split(" ")[1]?.trim();
      if (token) {
        const tokenUser = await User.findOne({
          telegramLinkToken: token,
          telegramLinkTokenExpires: { $gt: new Date() },
          status: "approved",
        });
        if (tokenUser) {
          tokenUser.telegramChatId = chatId;
          tokenUser.notificationPreferences = {
            ...tokenUser.notificationPreferences,
            telegram: true,
          };
          tokenUser.set("telegramLinkToken", "");
          tokenUser.set("telegramLinkTokenExpires", null);
          await tokenUser.save();

          await sendTelegramAlert(
            chatId,
            `✅ *Telegram Linked Successfully!*\n\nHello *${tokenUser.name}*! 🎓\n\nYour Telegram account is now connected to your Academic AI account (${tokenUser.email}).\n\nYou will receive:\n• 🔔 Daily 4:00 PM attendance check-in reminders\n• 📊 Attendance alerts for low-attendance subjects\n• 🎯 Exam planner updates\n\nType /start to explore all commands!`
          );
          return NextResponse.json({ ok: true });
        } else {
          await sendTelegramAlert(
            chatId,
            `❌ *Invalid or expired link token.*\n\nThe token you provided is either wrong or has expired (tokens are valid for 15 minutes).\n\nPlease go to *Settings → Notifications → Connect Telegram* on [hari07.tech](https://hari07.tech) to generate a new token.`
          );
          return NextResponse.json({ ok: true });
        }
      }
    }

    if (!user) {
      await sendTelegramAlert(
        chatId,
        `👋 *Welcome to Academic AI Bot!*\n\nTo connect this Telegram account to your Academic AI profile:\n\n1️⃣ Log in to [hari07.tech](https://hari07.tech)\n2️⃣ Go to *Settings → Notifications*\n3️⃣ Click *"Connect Telegram"* to get a 6-digit token\n4️⃣ Send: \`/link YOUR_TOKEN\` here\n\nIf you don't have an account yet, register at [hari07.tech](https://hari07.tech).`
      );
      return NextResponse.json({ ok: true });
    }

    // Handle /start command
    if (text === "/start") {
      const welcomeMsg = `👋 *Academic AI Assistant*

Hello *${user.name || "Student"}*! 🎓

I am your personal Academic AI Assistant on Telegram, connected directly to your website account at [hari07.tech](https://hari07.tech).

You can ask me any question about yourself, your academics, and your website records:
• 👤 *Profile & Info*: "What is my roll number?", "Which college & branch am I in?", "Show all my details"
• 📊 *Attendance & Bunks*: "What is my overall attendance?", "Can I bunk Distributed Systems?", "How many classes can I miss?"
• 📅 *Timetable & Schedule*: "What class do I have now?", "What is my schedule today?", "What classes do I have tomorrow?", "Show my weekly timetable"
• 📚 *Subjects & Credits*: "List all my enrolled subjects", "What are my credits and faculty?"
• 🎉 *Exams & Holidays*: "When is Pongal holiday?", "When are upcoming exams?"
• 🎯 *GATE 2027 Planner*: "What should I study today for GATE?", "Am I on track for Dec 31?", "Which subject is falling behind?", "Show my PYQ stats"
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

🎯 *GATE 2027 Commands:*
• \`/gate\` - Full GATE 2027 workload & deadline status
• \`/today\` - Today's 10-hour study timetable
• \`/motivate\` - Fresh GATE preparation motivation & mindset tip
• \`/gatelog 10\` - Log 10 hours of study immediately
• \`/reschedule 2\` - Reschedule 2 missed hours automatically

Just send your question in plain English and I'll look up your live records immediately!`;
      await sendTelegramAlert(chatId, helpMsg);
      return NextResponse.json({ ok: true });
    }

    // Fast-path GATE commands
    const lower = text.toLowerCase().trim();
    if (lower === "/gate" || lower === "/gatestatus") {
      const { executeAiTool } = await import("@/lib/ai/tools");
      const data = await executeAiTool("get_gate_workload_and_deadline_status", {}, user._id.toString());
      const recs = (data.recommendations || []).map((r: string) => `• ${r}`).join("\n");
      const examLabel = data.examLabel || "Exam";
      const msg = `🎯 *${examLabel} Preparation Snapshot*\n━━━━━━━━━━━━━━━━━━━━\n• 🔥 *Days to ${examLabel}:* **${data.daysRemainingUntilGateExam ?? 0} days** (${data.gateExamDate || "Exam Day"})\n• 📅 *Days to Phase 1 Finish:* **${data.daysRemainingUntilDeadline} days** (${data.phase1Deadline || "Dec 31, 2026"})\n• 📚 *Remaining Workload:* **${data.totalRemainingVideos} units** (${data.totalRemainingHours}h)\n• ⚡ *Available Study Capacity:* **${data.totalAvailableStudyHours} hrs** (@ ${data.dailyStudyHours || 6}h/day for ${data.effectiveStudyDays} study days)\n• 🎯 *Status:* ${data.isFeasibleByDeadline ? "✅ *ON TRACK*" : `⚠️ *WORKLOAD DEFICIT (${data.workloadGapHours} Hours)*`}\n\n💡 *Realistic Recommendations:*\n${recs}\n\n👉 [Open Full Planner on hari07.tech](https://hari07.tech/gate-planner)`;
      await sendTelegramAlert(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    if (lower === "/today" || lower === "/gatetoday") {
      const { executeAiTool } = await import("@/lib/ai/tools");
      const data = await executeAiTool("get_gate_study_schedule_today", {}, user._id.toString());
      const slotsList = (data.slots || [])
        .map((s: any, idx: number) => `• *Slot ${idx + 1} (${s.timeSlot}):* ${s.subjectName} (${s.plannedHours}h) - _${s.sessionType}_`)
        .join("\n") || "No slots scheduled";
      const msg = `🎯 *GATE 2027 Study Schedule Today (${data.dayName}, ${data.date})*\n━━━━━━━━━━━━━━━━━━━━\n• *Daily Target:* **${data.totalPlannedHours} Hours** (10h Daily Budget)\n• *Logged So Far:* **${data.hoursStudiedToday} hrs** (${data.videosCompletedToday} videos)\n\n📋 *Planned Study Slots:*\n${slotsList}\n\n💡 _Focus on conceptual depth in high-priority subjects!_`;
      await sendTelegramAlert(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    if (lower === "/motivate" || lower === "/gatemotivate") {
      const { GATE_MOTIVATION_QUOTES } = await import("@/lib/gate/calculations");
      const q = GATE_MOTIVATION_QUOTES[Math.floor(Math.random() * GATE_MOTIVATION_QUOTES.length)];
      const msg = `🔥 *Daily GATE CSE Mindset (${q.tag})*\n━━━━━━━━━━━━━━━━━━━━\n> _"${q.quote}"_\n> — *${q.author}*\n\n⚡ *Action Tip:* ${q.actionTip}`;
      await sendTelegramAlert(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    if (lower.startsWith("/gatelog")) {
      const parts = lower.split(" ");
      const hours = Number(parts[1]) || 10;
      const { GateSubject } = await import("@/lib/db/models/GateSubject");
      const { GateProgress } = await import("@/lib/db/models/GateProgress");

      let activeSub = await GateSubject.findOne({
        userId: user._id,
        remainingVideos: { $gt: 0 },
      }).sort({ priorityOrder: 1 });

      const avgDur = activeSub?.averageVideoDuration || 1.5;
      const vids = Math.max(1, Math.round(hours / avgDur));

      if (activeSub) {
        const actualDeduct = Math.min(activeSub.remainingVideos, vids);
        activeSub.remainingVideos = Math.max(0, activeSub.remainingVideos - actualDeduct);
        activeSub.completedVideos = (activeSub.completedVideos || 0) + actualDeduct;
        if (activeSub.remainingVideos === 0) activeSub.status = "Completed";
        await activeSub.save();

        await GateProgress.create({
          userId: user._id,
          subjectId: activeSub._id,
          date: new Date(),
          videosCompleted: actualDeduct,
          hoursStudied: hours,
          topicsCovered: `Telegram /gatelog command (${hours}h)`,
          notes: "Logged directly from Telegram",
          completionStatus: "Completed",
        });
      }

      const msg = `🎉 *GATE Study Logged Successfully!*\n\n• **Hours Recorded:** **${hours} Hours**\n• **Subject Progressed:** ${activeSub ? activeSub.name : "High-Priority Subject"}\n• **Videos Deducted:** ${vids} videos\n\nConsistency is how ranks under 100 are earned. Keep going! 🚀`;
      await sendTelegramAlert(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    if (lower.startsWith("/reschedule") || lower.startsWith("/gatereschedule")) {
      const parts = lower.split(" ");
      const missed = Number(parts[1]) || 2;
      const { executeAiTool } = await import("@/lib/ai/tools");
      const data = await executeAiTool("reschedule_gate_missed_lectures", { missedHours: missed }, user._id.toString());
      const msg = `🔄 *Missed Hours Rescheduled!*\n\n• **Hours Rescheduled:** **${data.missedHoursRescheduled} hrs**\n• **Algorithm Strategy:** ${data.redistributionStrategy}\n• **New Available Study Hours:** ${data.newAvailableStudyHours} hrs\n\n${data.feasibilityNote}`;
      await sendTelegramAlert(chatId, msg);
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
