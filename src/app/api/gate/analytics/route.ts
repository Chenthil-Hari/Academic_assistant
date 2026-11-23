import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/middleware-utils";
import connectToDatabase from "@/lib/db/connection";
import { GateSubject } from "@/lib/db/models/GateSubject";
import { GateProgress } from "@/lib/db/models/GateProgress";
import { GateUserSettings } from "@/lib/db/models/GateUserSettings";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest(req);
    if (errorResponse || !user) return errorResponse;

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(user.userId);

    const [subjects, settings] = await Promise.all([
      GateSubject.find({ userId: userObjectId }).sort({ priorityOrder: 1 }),
      GateUserSettings.findOne({ userId: userObjectId }),
    ]);

    // 1. Subject-wise progress metrics
    const subjectProgress = subjects.map((s) => {
      const init = s.initialVideos || (s.remainingVideos + (s.completedVideos || 0)) || 1;
      const comp = s.completedVideos || Math.max(0, init - s.remainingVideos);
      const rem = s.remainingVideos;
      const dur = s.averageVideoDuration || 1.5;
      const pct = init > 0 ? Number(((comp / init) * 100).toFixed(1)) : 100;

      return {
        id: s._id.toString(),
        name: s.name,
        code: s.code,
        priority: s.priority,
        priorityOrder: s.priorityOrder,
        color: s.color,
        initialVideos: init,
        completedVideos: comp,
        remainingVideos: rem,
        completionPercentage: pct,
        remainingHours: Number((rem * dur).toFixed(1)),
        completedHours: Number((comp * dur).toFixed(1)),
      };
    });

    // 2. Daily study hours over the last 14 days
    const past14Days = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const fourteenDaysAgo = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
    const progressDocs = await GateProgress.find({
      userId: userObjectId,
      date: { $gte: fourteenDaysAgo },
    }).sort({ date: 1 });

    const dailyMap: { [dateKey: string]: { hours: number; videos: number } } = {};
    for (const p of progressDocs) {
      const dKey = new Date(p.date).toISOString().split("T")[0];
      if (!dailyMap[dKey]) dailyMap[dKey] = { hours: 0, videos: 0 };
      dailyMap[dKey].hours += p.hoursStudied || 0;
      dailyMap[dKey].videos += p.videosCompleted || 0;
    }

    const targetDailyHours = settings?.dailyStudyHours || 10;
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dKey = d.toISOString().split("T")[0];
      const isSun = d.getDay() === 0;
      const actual = dailyMap[dKey]?.hours || 0;
      const videos = dailyMap[dKey]?.videos || 0;
      const planned = isSun ? 0 : targetDailyHours;

      past14Days.push({
        date: dKey,
        dayName: dayNames[d.getDay()],
        isRestDay: isSun,
        actualHours: Number(actual.toFixed(1)),
        plannedHours: planned,
        videosCompleted: videos,
      });
    }

    // 3. Priority breakdown
    let highHours = 0;
    let medHours = 0;
    let lowHours = 0;
    for (const sp of subjectProgress) {
      if (sp.priority === "High") highHours += sp.remainingHours;
      else if (sp.priority === "Medium") medHours += sp.remainingHours;
      else lowHours += sp.remainingHours;
    }

    const priorityBreakdown = [
      { name: "High Priority", hours: Number(highHours.toFixed(1)), color: "#3B82F6" },
      { name: "Medium Priority", hours: Number(medHours.toFixed(1)), color: "#F59E0B" },
      { name: "Low Priority", hours: Number(lowHours.toFixed(1)), color: "#94A3B8" },
    ];

    // 4. Weekly Productivity & Adherence
    const totalActualPast14 = past14Days.reduce((sum, d) => sum + d.actualHours, 0);
    const totalPlannedPast14 = past14Days.reduce((sum, d) => sum + d.plannedHours, 0);
    const adherencePercentage =
      totalPlannedPast14 > 0
        ? Number(((totalActualPast14 / totalPlannedPast14) * 100).toFixed(1))
        : 100;

    return NextResponse.json({
      success: true,
      subjectProgress,
      past14Days,
      priorityBreakdown,
      weeklySummary: {
        totalActualHours: Number(totalActualPast14.toFixed(1)),
        totalPlannedHours: Number(totalPlannedPast14.toFixed(1)),
        adherencePercentage,
        targetDailyHours,
      },
    });
  } catch (error: any) {
    console.error("GATE analytics error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
