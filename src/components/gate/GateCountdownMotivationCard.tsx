"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Target,
  Flame,
  Sparkles,
  Clock,
  Video,
  ArrowRight,
  RefreshCw,
  Quote,
  CheckCircle2,
  Calendar,
  Zap,
} from "lucide-react";
import { GATE_MOTIVATION_QUOTES, GateMotivation } from "@/lib/gate/calculations";

interface GateCountdownProps {
  variant?: "dashboard" | "planner";
  customWorkload?: any;
  examSettings?: {
    examType?: string;
    examLabel?: string;
    gateExamDate?: string;
    phase1Deadline?: string;
  };
}

export function GateCountdownMotivationCard({
  variant = "dashboard",
  customWorkload,
  examSettings,
}: GateCountdownProps) {
  const [data, setData] = useState<any>(customWorkload || null);
  const [settings, setSettings] = useState<any>(examSettings || null);
  const [loading, setLoading] = useState(!customWorkload);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    if (examSettings) setSettings(examSettings);
  }, [examSettings]);

  useEffect(() => {
    if (customWorkload) {
      setData(customWorkload);
      return;
    }
    fetchOverview();
  }, [customWorkload]);

  const fetchOverview = async () => {
    try {
      const res = await fetch("/api/gate/overview");
      const json = await res.json();
      if (json.success) {
        if (json.workload) setData(json.workload);
        if (json.settings) setSettings(json.settings);
      }
    } catch (err) {
      console.error("Failed to fetch GATE overview:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % GATE_MOTIVATION_QUOTES.length);
  };

  // Calculate days if not yet loaded from API
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const msPerDay = 1000 * 60 * 60 * 24;

  const defaultGateDate = new Date("2027-02-06T09:00:00.000Z");
  const defaultPhase1 = new Date("2026-12-31T23:59:59.999Z");

  const daysToGate =
    data?.daysRemainingUntilGateExam ??
    Math.max(0, Math.ceil((defaultGateDate.getTime() - now.getTime()) / msPerDay));

  const daysToPhase1 =
    data?.daysRemainingUntilDeadline ??
    Math.max(0, Math.ceil((defaultPhase1.getTime() - now.getTime()) / msPerDay));

  const currentMotivation: GateMotivation =
    data?.motivation && quoteIndex === 0
      ? data.motivation
      : GATE_MOTIVATION_QUOTES[quoteIndex % GATE_MOTIVATION_QUOTES.length];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border transition-all shadow-sm ${
        variant === "dashboard"
          ? "bg-gradient-to-br from-card via-card to-blue-500/5 hover:border-blue-500/40 p-5 sm:p-6"
          : "bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border-blue-500/30 p-5 sm:p-7"
      }`}
    >
      {/* Background glow decoration */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-5">
        {/* Header row: Badge, Countdown & Quick Jump */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-xs font-bold text-white shadow-sm shadow-blue-500/30">
              <Target className="h-3.5 w-3.5" />
              <span>{settings?.examLabel || "GATE 2027"}</span>
            </span>

            {/* Main Exam Countdown Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-black text-amber-500 dark:text-amber-400">
              <Flame className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
              <span>{daysToGate} Days to {settings?.examLabel || "Exam"}</span>
            </span>

            {/* Phase 1 Deadline Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {daysToPhase1} Days to Phase 1 Finish (
                {settings?.phase1Deadline
                  ? new Date(settings.phase1Deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "Dec 31"}
                )
              </span>
            </span>
          </div>

          {variant === "dashboard" && (
            <Link
              href="/gate-planner"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors group"
            >
              <span>Open {settings?.examLabel || "Exam"} Planner</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        {/* Motivational Quote Banner */}
        <div className="rounded-2xl border bg-background/80 backdrop-blur-sm p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                <Quote className="h-4 w-4" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                    {currentMotivation.tag}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    • {currentMotivation.author}
                  </span>
                </div>
                <p className="text-sm font-semibold italic text-foreground leading-relaxed">
                  &ldquo;{currentMotivation.quote}&rdquo;
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                  <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="font-medium text-foreground/80">
                    <strong className="text-foreground">Daily Mindset:</strong> {currentMotivation.actionTip}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleNextQuote}
              title="Next motivational thought"
              className="p-2 rounded-xl border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Workload Snapshot Metrics (if on dashboard) */}
        {variant === "dashboard" && data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="rounded-2xl border bg-card/60 p-3">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Remaining Videos
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-foreground">
                  {data.totalRemainingVideos ?? 430}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  / {data.totalInitialVideos ?? 430}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border bg-card/60 p-3">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Remaining Hours
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-blue-500">
                  {data.totalRemainingHours ?? 674.5}h
                </span>
                <span className="text-[11px] text-muted-foreground">lectures</span>
              </div>
            </div>

            <div className="rounded-2xl border bg-card/60 p-3">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Study Availability
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-emerald-500">10h</span>
                <span className="text-[11px] text-muted-foreground">/day (6 days)</span>
              </div>
            </div>

            <div className="rounded-2xl border bg-card/60 p-3">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                PYQ Phase Begins
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-purple-500">Jan 1</span>
                <span className="text-[11px] text-muted-foreground">2027</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
