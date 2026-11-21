import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { Notification } from "@/lib/db/models/Notification";
import { sendWebPushNotification } from "@/lib/notifications/web-push";
import { sendTelegramAlert } from "@/lib/notifications/telegram";
import { getUserFromRequest } from "@/lib/auth/jwt";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleMorningBriefingCron(req);
}

export async function POST(req: NextRequest) {
  return handleMorningBriefingCron(req);
}

async function handleMorningBriefingCron(req: NextRequest) {
  try {
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

    const query = currentUser && !isCronAuthorized
      ? { _id: currentUser.userId }
      : { "notificationPreferences.webPush": true };

    const users = await User.find(query);
    const results = [];
    const now = new Date();

    for (const u of users) {
      try {
        // Fetch briefing details for user
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        // We can internally construct the message or call the briefing logic
        const studentName = u.name ? u.name.split(" ")[0] : "Student";
        const title = `☀️ 8:00 AM Academic Briefing`;
        const message = `Good morning ${studentName}! Tap to listen to your morning briefing & review today's schedule and attendance criteria.`;

        await Notification.create({
          userId: u._id,
          title,
          message,
          type: "morning_briefing",
          actionUrl: "/dashboard",
          scheduledFor: now,
          sentAt: now,
          metadata: {
            studentName,
            time: "08:00 AM IST",
          },
        });

        let pushSent = false;
        if (u.webPushSubscription && u.notificationPreferences?.webPush) {
          pushSent = await sendWebPushNotification(u.webPushSubscription as any, {
            title,
            body: message,
            icon: "/icon.svg",
            data: { url: "/dashboard" },
          });
        }

        let telegramSent = false;
        if (u.telegramChatId && u.notificationPreferences?.telegram) {
          telegramSent = await sendTelegramAlert(
            u.telegramChatId,
            `*${title}*\n\n${message}\n\n[Open Dashboard](${appUrl}/dashboard)`
          );
        }

        results.push({
          userId: u._id,
          status: "briefing_sent",
          pushSent,
          telegramSent,
        });
      } catch (err: any) {
        results.push({ userId: u._id, status: "error", error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      dispatchedCount: results.length,
      results,
    });
  } catch (error: any) {
    console.error("Morning Briefing Cron Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Morning briefing cron failed" },
      { status: 500 }
    );
  }
}
