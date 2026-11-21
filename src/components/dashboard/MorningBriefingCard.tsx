"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  BellRing,
} from "lucide-react";

interface MorningBriefingData {
  briefingText: string;
  studentName: string;
  classesCount: number;
  firstClass: {
    subjectName: string;
    subjectCode: string;
    room: string;
    formattedTime: string;
  } | null;
  criticalSubject: {
    name: string;
    code: string;
    percentage: number;
    targetPercentage: number;
    buffer: number;
    deficit: number;
  } | null;
  upcomingEvents: Array<{
    id: string;
    title: string;
    eventType: string;
    startDate: string;
  }>;
  isHoliday?: boolean;
  holidayTitle?: string;
  targetPercentage?: number;
}

export function MorningBriefingCard() {
  const [data, setData] = useState<MorningBriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [isSupported, setIsSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    fetchBriefing();

    if (typeof window !== "undefined" && !("speechSynthesis" in window)) {
      setIsSupported(false);
    }

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const fetchBriefing = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/briefing/morning");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load morning briefing:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayVoice = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported on this device/browser.");
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();

    const textToSpeak =
      data?.briefingText ||
      "Good morning! Your academic schedule and attendance are up to date.";

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        (v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("Daniel"))) ||
        v.lang === "en-US" ||
        v.lang === "en-GB" ||
        v.lang === "en-IN"
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleStopVoice = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handleRateChange = (newRate: number) => {
    setSpeechRate(newRate);
    if (isPlaying) {
      handleStopVoice();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-card via-card to-blue-950/20 p-5 sm:p-6 shadow-sm">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm">
            <span className="text-xl">☀️</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                8:00 AM Daily Briefing
              </h3>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-500 border border-blue-500/20">
                Voice Audio Ready
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Personalized morning audio dispatch with schedule, safe-zone criteria & deadlines
            </p>
          </div>
        </div>

        {/* Audio controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Speed selector */}
          <div className="flex items-center rounded-xl bg-muted/60 p-0.5 text-[11px] font-semibold">
            {[0.9, 1.0, 1.2].map((rate) => (
              <button
                key={rate}
                onClick={() => handleRateChange(rate)}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  speechRate === rate
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Voice Play/Pause button */}
          <button
            onClick={handlePlayVoice}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all ${
              isPlaying
                ? "bg-amber-500 text-white shadow-amber-500/25 hover:bg-amber-600 animate-pulse"
                : "bg-primary text-primary-foreground shadow-primary/25 hover:bg-primary/90"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span>Pause</span>
              </>
            ) : isPaused ? (
              <>
                <Play className="h-3.5 w-3.5" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5" />
                <span>Listen Audio</span>
              </>
            )}
          </button>

          {(isPlaying || isPaused) && (
            <button
              onClick={handleStopVoice}
              className="rounded-xl border bg-card p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              title="Stop playback"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Visualizer Bar when playing */}
      {isPlaying && (
        <div className="my-3 flex items-center justify-center gap-1 py-1 px-4 rounded-xl bg-primary/10 border border-primary/20">
          <span className="text-[11px] font-semibold text-primary mr-2">Speaking:</span>
          <span className="h-3 w-1 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="h-5 w-1 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="h-2 w-1 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
          <span className="h-4 w-1 bg-primary rounded-full animate-bounce [animation-delay:75ms]" />
          <span className="h-6 w-1 bg-primary rounded-full animate-bounce [animation-delay:225ms]" />
          <span className="h-3 w-1 bg-primary rounded-full animate-bounce [animation-delay:120ms]" />
        </div>
      )}

      {/* Briefing text script card */}
      <div className="mt-4 rounded-2xl bg-muted/40 p-4 border border-border/60">
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 w-3/4 bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-1/2 bg-muted rounded" />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium leading-relaxed text-foreground/90 italic">
              &ldquo;{data?.briefingText}&rdquo;
            </p>

            {/* Structured badge highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border/40 text-xs">
              {/* Classes badge */}
              <div className="flex items-center gap-2 rounded-xl bg-card p-2.5 border">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    Today&apos;s Classes
                  </span>
                  <span className="font-semibold text-foreground">
                    {data?.classesCount === 0
                      ? "No classes scheduled"
                      : `${data?.classesCount} scheduled (First: ${data?.firstClass?.room})`}
                  </span>
                </div>
              </div>

              {/* Critical Subject badge */}
              <div className="flex items-center gap-2 rounded-xl bg-card p-2.5 border">
                <AlertTriangle
                  className={`h-4 w-4 shrink-0 ${
                    (data?.criticalSubject?.percentage || 100) < (data?.criticalSubject?.targetPercentage || 75)
                      ? "text-red-500"
                      : "text-amber-500"
                  }`}
                />
                <div className="truncate">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    Attendance Target
                  </span>
                  <span className="font-semibold text-foreground">
                    {data?.criticalSubject
                      ? `${data.criticalSubject.name}: ${Math.round(data.criticalSubject.percentage)}%`
                      : "All subjects safe"}
                  </span>
                </div>
              </div>

              {/* Deadlines badge */}
              <div className="flex items-center gap-2 rounded-xl bg-card p-2.5 border">
                <Clock className="h-4 w-4 text-indigo-500 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    Upcoming Deadlines
                  </span>
                  <span className="font-semibold text-foreground">
                    {data?.upcomingEvents && data.upcomingEvents.length > 0
                      ? `${data.upcomingEvents[0].title}`
                      : "No immediate deadlines"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
