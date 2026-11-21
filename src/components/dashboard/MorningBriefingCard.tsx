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
  Mic,
  Loader2,
  Headphones,
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
}

const VOICES = [
  { id: "christopher", label: "Christopher (Natural Male)" },
  { id: "neerja", label: "Neerja (Indian Accent Female)" },
  { id: "prabhat", label: "Prabhat (Indian Accent Male)" },
  { id: "jenny", label: "Jenny (Warm Female)" },
  { id: "aria", label: "Aria (News Anchor)" },
];

export function MorningBriefingCard() {
  const [data, setData] = useState<MorningBriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("christopher");
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [audioProgress, setAudioProgress] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedVoiceRef = useRef<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    fetchBriefing();

    return () => {
      stopAndCleanupAudio();
    };
  }, []);

  const stopAndCleanupAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    loadedVoiceRef.current = null;
    setIsPlaying(false);
    setIsPaused(false);
    setAudioProgress(0);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

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

  const playVoice = async (targetVoice: string) => {
    // If the SAME voice is already loaded and was just paused, resume it
    if (
      audioRef.current &&
      isPaused &&
      loadedVoiceRef.current === targetVoice
    ) {
      audioRef.current.play();
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }

    // Stop and clean up any previous audio
    stopAndCleanupAudio();

    setAudioLoading(true);
    try {
      // Fetch fresh audio buffer directly using fetch to guarantee cookies and headers
      const audioUrl = `/api/briefing/audio?voice=${targetVoice}&t=${Date.now()}`;
      const res = await fetch(audioUrl, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Audio API responded with status ${res.status}`);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      blobUrlRef.current = objectUrl;

      const audio = new Audio(objectUrl);
      audio.playbackRate = playbackRate;

      audio.onplay = () => {
        setIsPlaying(true);
        setIsPaused(false);
        setAudioLoading(false);
      };

      audio.onpause = () => {
        setIsPlaying(false);
        setIsPaused(true);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setAudioProgress(0);
      };

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onerror = () => {
        console.warn("Real audio playback failed, falling back to browser speech synthesis");
        setAudioLoading(false);
        fallbackWebSpeech(targetVoice);
      };

      audioRef.current = audio;
      loadedVoiceRef.current = targetVoice;

      await audio.play();
    } catch (err) {
      console.warn("Audio loading error, falling back:", err);
      setAudioLoading(false);
      fallbackWebSpeech(targetVoice);
    }
  };

  const handlePlayButtonClick = () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        setIsPaused(true);
      } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.pause();
        setIsPlaying(false);
        setIsPaused(true);
      }
      return;
    }

    playVoice(selectedVoice);
  };

  const handleVoiceChange = (newVoice: string) => {
    setSelectedVoice(newVoice);
    // If audio is currently playing or paused, immediately reload and play the new voice
    if (isPlaying || isPaused || audioLoading) {
      stopAndCleanupAudio();
      playVoice(newVoice);
    } else {
      // Pre-clear so next play fetches the new voice
      stopAndCleanupAudio();
    }
  };

  const fallbackWebSpeech = (voiceKey: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = data?.briefingText || "Good morning! Your academic updates are ready.";
      const u = new SpeechSynthesisUtterance(textToSpeak);
      u.rate = playbackRate;

      // Select matching voice in system
      const voices = window.speechSynthesis.getVoices();
      let matchedVoice = null;

      if (voiceKey === "neerja" || voiceKey === "prabhat") {
        matchedVoice = voices.find((v) => v.lang === "en-IN" || v.lang.startsWith("en-IN"));
      } else if (voiceKey === "jenny" || voiceKey === "aria") {
        matchedVoice = voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Female") || v.name.includes("Zira") || v.name.includes("Samantha") || v.name.includes("Victoria"))
        );
      } else {
        matchedVoice = voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Male") || v.name.includes("David") || v.name.includes("Daniel") || v.name.includes("Guy"))
        );
      }

      if (matchedVoice) {
        u.voice = matchedVoice;
      }

      u.onstart = () => {
        setIsPlaying(true);
        setIsPaused(false);
      };
      u.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };
      window.speechSynthesis.speak(u);
    }
  };

  const handleStopVoice = () => {
    stopAndCleanupAudio();
  };

  const handleRateChange = (newRate: number) => {
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
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
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                <Headphones className="h-2.5 w-2.5" />
                <span>Real Human Voice</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Natural neural voice briefing with today&apos;s timetable, attendance criteria & deadlines
            </p>
          </div>
        </div>

        {/* Audio controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Voice Selector Dropdown */}
          <select
            value={selectedVoice}
            onChange={(e) => handleVoiceChange(e.target.value)}
            className="rounded-xl border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
            title="Select natural neural voice"
          >
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Speed selector */}
          <div className="flex items-center rounded-xl bg-muted/60 p-0.5 text-[11px] font-semibold">
            {[0.9, 1.0, 1.25].map((rate) => (
              <button
                key={rate}
                onClick={() => handleRateChange(rate)}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  playbackRate === rate
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
            onClick={handlePlayButtonClick}
            disabled={loading || audioLoading}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all ${
              isPlaying
                ? "bg-amber-500 text-white shadow-amber-500/25 hover:bg-amber-600 animate-pulse"
                : "bg-primary text-primary-foreground shadow-primary/25 hover:bg-primary/90"
            }`}
          >
            {audioLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Switching Voice...</span>
              </>
            ) : isPlaying ? (
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
                <span>Listen Briefing</span>
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

      {/* Dynamic Soundwave Visualizer Bar when playing */}
      {isPlaying && (
        <div className="my-3 space-y-1.5">
          <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5 text-primary font-bold">
              <Mic className="h-3 w-3 animate-pulse" />
              Speaking as {VOICES.find(v => v.id === selectedVoice)?.label}
            </span>
            <span>Real Neural Voice (Edge TTS)</span>
          </div>
          <div className="flex items-center justify-center gap-1 py-1.5 px-4 rounded-xl bg-primary/10 border border-primary/20">
            <span className="h-3 w-1 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="h-6 w-1 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="h-2 w-1 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
            <span className="h-5 w-1 bg-primary rounded-full animate-bounce [animation-delay:75ms]" />
            <span className="h-7 w-1 bg-primary rounded-full animate-bounce [animation-delay:225ms]" />
            <span className="h-4 w-1 bg-primary rounded-full animate-bounce [animation-delay:120ms]" />
            <span className="h-6 w-1 bg-primary rounded-full animate-bounce [animation-delay:180ms]" />
            <span className="h-3 w-1 bg-primary rounded-full animate-bounce [animation-delay:90ms]" />
          </div>
          {/* Progress bar */}
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${audioProgress}%` }}
            />
          </div>
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
