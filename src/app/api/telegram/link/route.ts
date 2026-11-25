import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { User } from "@/lib/db/models/User";
import { sendTelegramAlert } from "@/lib/notifications/telegram";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// POST /api/telegram/link — generate a 6-digit link token for the logged-in user
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const dbUser = await User.findById(new mongoose.Types.ObjectId(user.userId));
    if (!dbUser) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    // Generate a 6-digit numeric token and store it on the user (expires in 15 min)
    const token = String(Math.floor(100000 + Math.random() * 900000));
    dbUser.set("telegramLinkToken", token);
    dbUser.set("telegramLinkTokenExpires", new Date(Date.now() + 15 * 60 * 1000));
    await dbUser.save();

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "Academic_hari_bot";
    return NextResponse.json({
      success: true,
      token,
      botUsername,
      instruction: `Open Telegram, search @${botUsername}, and send: /link ${token}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE /api/telegram/link — disconnect Telegram from the logged-in user
export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    await User.findByIdAndUpdate(new mongoose.Types.ObjectId(user.userId), {
      $set: {
        telegramChatId: "",
        "notificationPreferences.telegram": false,
      },
    });

    return NextResponse.json({ success: true, message: "Telegram disconnected." });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
