import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { GateSubject } from "@/lib/db/models/GateSubject";
import { GateUserSettings } from "@/lib/db/models/GateUserSettings";
import { GateProgress } from "@/lib/db/models/GateProgress";
import { calculateGateWorkload, INITIAL_GATE_SUBJECTS } from "@/lib/gate/calculations";
import { generateGateSchedule } from "@/lib/gate/scheduler";
import { sendTelegramAlert, TelegramReplyMarkup } from "@/lib/notifications/telegram";
import { getUserFromRequest } from "@/lib/auth/jwt";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleGateDaily(req);
}

export async function POST(req: NextRequest) {
  return handleGateDaily(req);
}

async function handleGateDaily(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedMode = searchParams.get("mode"); // "morning" | "evening" | "test"
    const force = searchParams.get("force") === "true";

    // Authorization: Vercel CRON secret or user session
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "academic_ai_cron_secret_auth_token_99";
    const isCronAuthorized = authHeader === `Bearer ${cronSecret}`;
    const currentUser = getUserFromRequest(req);

    if (!isCronAuthorized && !currentUser && !force) {
      return NextResponse.json(
        { success: false, message: "Unauthorized cron or user request." },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Determine target users
    const query = currentUser && !isCronAuthorized
      ? { _id: currentUser.userId }
      : {
          telegramChatId: { $exists: true, $ne: "" },
          "notificationPreferences.telegram": true,
        };

    let users = await User.find(query);
    if (users.length === 0 && currentUser) {
      const u = await User.findById(currentUser.userId);
      if (u) users = [u];
    }

    // Fallback: If no telegram preference is set, find chenthilhari@gmail.com
    if (users.length === 0) {
      const defaultUser = await User.findOne({ email: "chenthilhari@gmail.com" });
      if (defaultUser && defaultUser.telegramChatId) {
        users = [defaultUser];
      }
    }

    // Determine morning vs evening if not specified
    // IST = UTC + 5:30.
    const nowUtc = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(nowUtc.getTime() + istOffset);
    const istHour = nowIst.getUTCHours();

    const mode = requestedMode || (istHour < 15 ? "morning" : "evening");

    const results = [];

    for (const u of users) {
      const chatId = u.telegramChatId;
      if (!chatId) {
        results.push({ userId: u._id, status: "skipped_no_chat_id" });
        continue;
      }

      // 1. Ensure GATE subjects and settings exist
      let count = await GateSubject.countDocuments({ userId: u._id });
      if (count === 0) {
        await GateSubject.insertMany(
          INITIAL_GATE_SUBJECTS.map((s) => ({
            ...s,
            userId: u._id,
            initialVideos: s.remainingVideos,
            completedVideos: 0,
            status: "In Progress",
          }))
        );
      }

      let settings = await GateUserSettings.findOne({ userId: u._id });
      if (!settings) {
        settings = await GateUserSettings.create({
          userId: u._id,
          dailyStudyHours: 10,
          studyDaysPerWeek: 6,
          restDayOfWeek: 0,
          phase1Deadline: new Date("2026-12-31T23:59:59.999Z"),
          pyqStartDate: new Date("2027-01-01T00:00:00.000Z"),
          currentPhase: "Phase 1 - Lectures & Concept",
          playbackSpeed: 1.0,
        });
      }

      const subjects = await GateSubject.find({ userId: u._id }).sort({ priorityOrder: 1 });

      const workload = calculateGateWorkload({
        subjects,
        deadline: settings.phase1Deadline,
        gateExamDate: settings.gateExamDate || new Date("2027-02-06T09:00:00.000Z"),
        dailyStudyHours: settings.dailyStudyHours || 10,
        studyDaysPerWeek: settings.studyDaysPerWeek || 6,
        playbackSpeed: settings.playbackSpeed || 1.0,
      });

      const todayDateStr = nowIst.toISOString().split("T")[0];
      const isSunday = nowIst.getUTCDay() === 0;

      let delivered = false;

      if (mode === "morning" || mode === "test") {
        // ─── MORNING STUDY TARGET BRIEFING ───
        const schedule = generateGateSchedule({
          subjects,
          startDate: nowIst,
          daysToGenerate: 1,
          dailyStudyHours: settings.dailyStudyHours || 10,
          deadline: settings.phase1Deadline,
        });

        const todaySchedule = schedule[0];
        let slotsText = "";
        if (isSunday) {
          slotsText = "🏖️ *Sunday Rest & Optional Revision Day*\n• Review short notes & formula sheet\n• Attempt 1 light revision quiz\n• Rest your mind for the upcoming week";
        } else if (todaySchedule && todaySchedule.slots && todaySchedule.slots.length > 0) {
          slotsText = todaySchedule.slots
            .map(
              (s: any, idx: number) =>
                `• *Slot ${idx + 1} (${s.timeSlot}):* ${s.subjectName} (${s.plannedHours}h) [${s.sessionType}]`
            )
            .join("\n");
        } else {
          slotsText = "• 10h Deep Work Focus on High-Priority Core Subjects";
        }

        const mot = workload.motivation;
        const msg = `🌅 *Good Morning, ${u.name || "Aspirant"}!* 🚀\n\n🎯 *GATE 2027 Morning Study Briefing*\n━━━━━━━━━━━━━━━━━━━━\n• 🔥 *${workload.daysRemainingUntilGateExam} Days to GATE 2027 Exam* (Feb 6)\n• 📅 *${workload.daysRemainingUntilDeadline} Days to Phase 1 Finish* (Dec 31)\n• 📚 *Remaining Workload:* ${workload.totalRemainingVideos} videos (${workload.totalRemainingHours}h)\n• ⚡ *Target for Today:* ${isSunday ? "Light Revision / Rest" : `${settings.dailyStudyHours} Hours Deep Study`}\n\n📋 *Today's Planned Study Slots:*\n${slotsText}\n\n💡 *Daily Mindset Quote (${mot.tag}):*\n> _"${mot.quote}"_\n> — *${mot.author}*\n\n⚡ *Action Tip:* ${mot.actionTip}\n━━━━━━━━━━━━━━━━━━━━\n_Give your 100% to today's study blocks!_`;

        const replyMarkup: TelegramReplyMarkup = {
          inline_keyboard: [
            [
              {
                text: "📖 Open GATE Planner",
                url: "https://hari07.tech/gate-planner",
              },
              {
                text: "⚡ Log 10h Completed",
                callback_data: "gate_log_10",
              },
            ],
            [
              {
                text: "🔄 Refresh Motivation",
                callback_data: "gate_refresh_motivation",
              },
            ],
          ],
        };

        delivered = await sendTelegramAlert(chatId, msg, replyMarkup);
      } else {
        // ─── EVENING STUDY ACCOUNTABILITY CHECK-IN ───
        // Calculate today's logged hours so far
        const startOfDay = new Date(nowIst);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(nowIst);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const logsToday = await GateProgress.find({
          userId: u._id,
          date: { $gte: startOfDay, $lte: endOfDay },
        });

        const loggedHoursToday = logsToday.reduce((sum, l) => sum + (l.hoursStudied || 0), 0);
        const loggedVideosToday = logsToday.reduce((sum, l) => sum + (l.videosCompleted || 0), 0);

        const msg = `🌙 *GATE 2027 Daily Accountability Check-in*\n━━━━━━━━━━━━━━━━━━━━\nHello *${u.name || "Aspirant"}*,\nYour target today was *${settings.dailyStudyHours} Hours* of focused preparation.\n\n• ⏱️ *Logged Today:* **${loggedHoursToday} Hours** (${loggedVideosToday} videos)\n• 🔥 *Countdown:* **${workload.daysRemainingUntilGateExam} Days to GATE 2027**\n\nHow did today's study session go? Tap a button below to log your progress instantly:`;

        const replyMarkup: TelegramReplyMarkup = {
          inline_keyboard: [
            [
              {
                text: "✅ Log 10h Completed",
                callback_data: "gate_log_10",
              },
              {
                text: "⚡ Log 8h Completed",
                callback_data: "gate_log_8",
              },
            ],
            [
              {
                text: "⏱️ Log 6h Completed",
                callback_data: "gate_log_6",
              },
              {
                text: "⚠️ Need Reschedule",
                callback_data: "gate_reschedule_prompt",
              },
            ],
            [
              {
                text: "📊 View Progress on hari07.tech",
                url: "https://hari07.tech/gate-planner",
              },
            ],
          ],
        };

        delivered = await sendTelegramAlert(chatId, msg, replyMarkup);
      }

      results.push({
        userId: u._id,
        email: u.email,
        chatId,
        mode,
        delivered,
      });
    }

    return NextResponse.json({
      success: true,
      mode,
      processedCount: users.length,
      results,
    });
  } catch (error: any) {
    console.error("Gate daily cron error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
