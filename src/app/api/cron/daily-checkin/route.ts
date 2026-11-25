import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { Notification } from "@/lib/db/models/Notification";
import { getOrCreateDailyCheckin } from "@/lib/attendance/session-generator";
import { sendWebPushNotification } from "@/lib/notifications/web-push";
import { sendTelegramAlert } from "@/lib/notifications/telegram";
import { getUserFromRequest } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  return handleCheckin(req);
}

export async function POST(req: NextRequest) {
  return handleCheckin(req);
}

async function handleCheckin(req: NextRequest) {
  try {
    // 1. Authorization check: Vercel CRON secret or user session
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "academic_ai_cron_secret_auth_token_99";
    const isCronAuthorized = authHeader === `Bearer ${cronSecret}`;
    const currentUser = getUserFromRequest(req);

    if (!isCronAuthorized && !currentUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized cron or user request." },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // If triggered by a specific user manually
    const query = currentUser && !isCronAuthorized
      ? { _id: currentUser.userId }
      : {
          status: "approved",
          $or: [
            { "notificationPreferences.webPush": true },
            {
              "notificationPreferences.telegram": true,
              telegramChatId: { $exists: true, $ne: "" },
            },
          ],
        };

    const users = await User.find(query);
    const results = [];

    const now = new Date();
    // Convert to IST representation
    const istTimeStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);

    for (const u of users) {
      try {
        const checkin = await getOrCreateDailyCheckin(u._id, now);

        if (checkin.isHoliday) {
          results.push({
            userId: u._id,
            status: "holiday",
            title: checkin.holidayTitle,
          });
          continue;
        }

        if (checkin.items.length === 0) {
          results.push({
            userId: u._id,
            status: "no_classes_scheduled",
          });
          continue;
        }

        const pendingItems = checkin.items.filter((item) => item.status === "Pending");

        // Create in-app notification
        const title = "4:00 PM Attendance Check-in";
        const message = pendingItems.length > 0
          ? `You have ${pendingItems.length} class(es) to check in for today. Mark your attendance!`
          : `All ${checkin.items.length} classes for today have been checked in.`;

        await Notification.create({
          userId: u._id,
          title,
          message,
          type: "daily_checkin",
          actionUrl: "/attendance",
          scheduledFor: now,
          sentAt: now,
          metadata: {
            classesCount: checkin.items.length,
            pendingCount: pendingItems.length,
            istTimestamp: istTimeStr,
          },
        });

        // Send Web Push Notification if user has subscription
        let pushSent = false;
        if (u.webPushSubscription && u.notificationPreferences?.webPush) {
          pushSent = await sendWebPushNotification(u.webPushSubscription, {
            title,
            body: message,
            url: "/attendance",
            data: { type: "daily_checkin", pendingCount: pendingItems.length },
          });
        }

        // Send Telegram alert if user has telegramChatId
        let telegramSent = false;
        if (u.telegramChatId && u.notificationPreferences?.telegram) {
          const classList = checkin.items
            .map((i) => `• ${i.subjectCode} (${i.startTime} - ${i.endTime}): *${i.status}*`)
            .join("\n");

          const todayIso = now.toISOString().split("T")[0];
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hari07.tech";

          const tgMessage = `🔔 *Academic AI - 4:00 PM Daily Check-in*\n\n${message}\n\n*Today's Schedule:*\n${classList}\n\n👉 Tap below to mark all attended or review individual classes:`;

          // Interactive 1-Tap Inline Keyboard
          const replyMarkup = {
            inline_keyboard: [
              [
                { text: "✅ Mark All Attended", callback_data: `checkin_all_${todayIso}` },
                { text: "📝 Review in App", url: `${appUrl}/attendance` },
              ],
            ],
          };

          telegramSent = await sendTelegramAlert(u.telegramChatId, tgMessage, replyMarkup);
        }

        results.push({
          userId: u._id,
          classesCount: checkin.items.length,
          pendingCount: pendingItems.length,
          pushSent,
          telegramSent,
        });
      } catch (userErr: any) {
        console.error(`Error processing check-in for user ${u._id}:`, userErr);
        results.push({ userId: u._id, error: userErr.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Daily check-in processed for ${results.length} user(s).`,
      timestampIST: istTimeStr,
      results,
    });
  } catch (error: any) {
    console.error("Cron daily check-in error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
