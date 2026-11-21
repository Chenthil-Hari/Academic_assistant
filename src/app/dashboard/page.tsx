"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Calendar,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  FileText,
  UploadCloud,
  Check,
  X,
  MinusCircle,
  ArrowRight,
  CalendarCheck,
  Target,
  BookOpen,
} from "lucide-react";
import { formatTime } from "@/lib/utils";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { ElectricBorder } from "@/components/ui/ElectricBorder";
import { useTheme } from "@/components/layout/ThemeProvider";

export default function DashboardPage() {
  const { actualTheme } = useTheme();
  const [stats, setStats] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, eventsRes, userRes] = await Promise.all([
        fetch("/api/attendance/stats"),
        fetch("/api/calendar?upcoming=true"),
        fetch("/api/auth/me"),
      ]);

      const [statsJson, eventsJson, userJson] = await Promise.all([
        statsRes.json(),
        eventsRes.json(),
        userRes.json(),
      ]);

      if (statsJson.success) setStats(statsJson);
      if (eventsJson.success) setUpcomingEvents((eventsJson.events || []).slice(0, 4));
      if (userJson.success) setUser(userJson.user);
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };





  const overall = stats?.overall;
  const targetPct = stats?.targetPercentage || 75;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Top welcome banner */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary mb-2 border border-primary/20">
              <Sparkles className="h-3 w-3" />
              <span>Personal Student OS</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Welcome back, {user?.name || "Student"} 👋
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Your personal timetable, real-time attendance calculations & daily 4:00 PM check-ins
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-xl border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-sm transition-all"
            >
              <UploadCloud className="h-4 w-4 text-primary" />
              <span>Upload PDF</span>
            </Link>
            <Link
              href="/ai-assistant"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span>Ask Academic AI</span>
            </Link>
          </div>
        </div>

        {/* PWA Install Banner */}
        <PWAInstallPrompt variant="banner" />

        {/* Top Metrics Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Overall Attendance Card */}
          <div className="rounded-3xl border bg-card p-4 sm:p-5 shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Overall Attendance
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  (overall?.overallPercentage || 0) >= targetPct
                    ? "bg-emerald-500/10 text-emerald-500"
                    : (overall?.overallPercentage || 0) >= targetPct - 10
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {overall?.status || (loading ? "--" : "Safe")}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-foreground">
                {overall ? `${overall.overallPercentage}%` : "--%"}
              </span>
              <span className="text-xs text-muted-foreground">
                (Target: {targetPct}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (overall?.overallPercentage || 0) >= targetPct
                    ? "bg-emerald-500"
                    : (overall?.overallPercentage || 0) >= targetPct - 10
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, overall?.overallPercentage || 0)}%` }}
              />
            </div>

            <div className="text-[11px] text-muted-foreground flex justify-between pt-1">
              <span>Attended: {overall?.totalAttended || 0}</span>
              <span>Conducted: {overall?.totalConducted || 0}</span>
            </div>
          </div>

          {/* Bunk Buffer / Classes Needed */}
          <div className="rounded-3xl border bg-card p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Bunk Safety Buffer
              </span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>

            <div>
              {overall?.maxClassesCanMiss && overall.maxClassesCanMiss > 0 ? (
                <>
                  <div className="flex items-baseline gap-1 text-emerald-500">
                    <span className="text-3xl font-extrabold">{overall.maxClassesCanMiss}</span>
                    <span className="text-xs font-semibold">classes</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You can safely miss without dropping below {targetPct}%.
                  </p>
                </>
              ) : overall?.classesNeededForTarget && overall.classesNeededForTarget > 0 ? (
                <>
                  <div className="flex items-baseline gap-1 text-red-500">
                    <span className="text-3xl font-extrabold">{overall.classesNeededForTarget}</span>
                    <span className="text-xs font-semibold">classes</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Must attend consecutively to reach {targetPct}%.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-3xl font-extrabold text-foreground">0</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    On boundary threshold for {targetPct}%.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Lowest Attendance Subject */}
          <div className="rounded-3xl border bg-card p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lowest Subject
              </span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>

            {overall?.lowestAttendanceSubject ? (
              <div className="min-w-0">
                <div className="text-base font-bold text-foreground truncate">
                  {overall.lowestAttendanceSubject.subjectName}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-black ${
                      overall.lowestAttendanceSubject.percentage < targetPct
                        ? "text-red-500"
                        : "text-foreground"
                    }`}
                  >
                    {overall.lowestAttendanceSubject.percentage}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {overall.lowestAttendanceSubject.percentage < targetPct
                      ? "Needs attention"
                      : "Safe"}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-lg font-bold text-foreground">None</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  All recorded subjects are above target threshold.
                </p>
              </div>
            )}
          </div>

          {/* Total Subjects Count */}
          <div className="rounded-3xl border bg-card p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Subjects
              </span>
              <BookOpen className="h-4 w-4 text-blue-500" />
            </div>

            <div>
              <div className="flex items-baseline gap-1 text-foreground">
                <span className="text-3xl font-extrabold">
                  {stats?.subjects ? stats.subjects.length : 0}
                </span>
                <span className="text-xs text-muted-foreground">registered</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {stats?.subjects?.filter((s: any) => s.status === "Safe").length || 0} safe above {targetPct}%
              </p>
            </div>
          </div>
        </div>

        {/* Two column grid: Subject Attendance Cards & Upcoming Events */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Subjects Attendance Breakdown (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Subject Attendance</h2>
                <p className="text-xs text-muted-foreground">
                  Formula: (Attended / Conducted) × 100
                </p>
              </div>
              <Link
                href="/attendance"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>View Full History</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {!stats?.subjects || stats.subjects.length === 0 ? (
              <div className="rounded-3xl border bg-card p-8 text-center space-y-3">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">
                  No subjects registered yet.
                </p>
                <div className="flex justify-center gap-3">
                  <Link
                    href="/upload"
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    Upload Timetable PDF
                  </Link>
                  <Link
                    href="/attendance"
                    className="rounded-xl border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    Add Subject Manually
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.subjects.map((sub: any) => (
                  <div
                    key={sub.subjectId}
                    className="rounded-3xl border bg-card p-4 sm:p-5 shadow-sm space-y-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-extrabold text-base text-foreground block truncate">
                          {sub.subjectCode}
                        </span>
                        <h3 className="text-xs text-muted-foreground truncate">
                          {sub.subjectName}
                        </h3>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                          sub.status === "Safe"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : sub.status === "Warning"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-2xl font-black text-foreground">
                        {sub.percentage}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {sub.attended} / {sub.conducted} classes
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          sub.status === "Safe"
                            ? "bg-emerald-500"
                            : sub.status === "Warning"
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(100, sub.percentage)}%` }}
                      />
                    </div>

                    <div className="pt-1 text-[11px] text-muted-foreground">
                      {sub.maxClassesCanMiss > 0 ? (
                        <span className="text-emerald-500 font-medium">
                          Can miss {sub.maxClassesCanMiss} class(es) safely
                        </span>
                      ) : sub.classesNeededForTarget > 0 ? (
                        <span className="text-red-500 font-medium">
                          Must attend {sub.classesNeededForTarget} class(es) to reach {sub.targetPercentage}%
                        </span>
                      ) : (
                        <span>On target threshold ({sub.targetPercentage}%)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Upcoming Exams & Quick AI (1 col) */}
          <div className="space-y-6">
            {/* Upcoming Academic Events */}
            <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">Upcoming Exams & Events</h3>
                </div>
                <Link
                  href="/calendar"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View All
                </Link>
              </div>

              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No upcoming exams or events recorded in calendar.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((ev) => (
                    <div
                      key={ev._id}
                      className="flex items-start justify-between rounded-2xl border bg-muted/40 p-3"
                    >
                      <div>
                        <div className="font-semibold text-xs text-foreground">{ev.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(ev.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                          {ev.subjectId && ` • ${ev.subjectId.code}`}
                        </div>
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          ev.type === "Exam"
                            ? "bg-red-500/10 text-red-500"
                            : ev.type === "Assignment"
                            ? "bg-amber-500/10 text-amber-500"
                            : ev.type === "Holiday"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-blue-500/10 text-blue-500"
                        }`}
                      >
                        {ev.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick AI Assistant Card */}
            <ElectricBorder
              color="#7df9ff"
              glowColor="#6366f1"
              speed={0.9}
              chaos={0.35}
              spread={0.5}
              strands={3}
              thickness={1.3}
              borderRadius={24}
              theme={actualTheme === "light" ? "light" : "dark"}
              className="w-full"
            >
              <div className="rounded-3xl border bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-blue-500/15 p-6 shadow-sm space-y-4 w-full">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">AI Assistant Ready</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ask questions about your classes, bunk safety calculator, or academic schedule directly.
                </p>

                <div className="space-y-2">
                  <Link
                    href="/ai-assistant?q=What classes do I have today?"
                    className="block rounded-xl bg-card/80 p-2.5 text-xs font-medium text-foreground hover:bg-card transition-colors shadow-sm"
                  >
                    &quot;What classes do I have today?&quot; →
                  </Link>
                  <Link
                    href="/ai-assistant?q=How many classes can I miss?"
                    className="block rounded-xl bg-card/80 p-2.5 text-xs font-medium text-foreground hover:bg-card transition-colors shadow-sm"
                  >
                    &quot;How many classes can I miss?&quot; →
                  </Link>
                  <Link
                    href="/ai-assistant?q=Which subject has the lowest attendance?"
                    className="block rounded-xl bg-card/80 p-2.5 text-xs font-medium text-foreground hover:bg-card transition-colors shadow-sm"
                  >
                    &quot;Which subject has the lowest attendance?&quot; →
                  </Link>
                </div>

                <Link
                  href="/ai-assistant"
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
                >
                  <span>Open Full Chat Assistant</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </ElectricBorder>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
