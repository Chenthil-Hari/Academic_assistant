"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  Minimize2,
  Maximize2,
  X,
} from "lucide-react";
import { Room, RoomEvent } from "livekit-client";

interface JarvisCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  autoGreeting?: string;
}

export function JarvisCallModal({
  isOpen,
  onClose,
  userName = "Student",
  autoGreeting,
}: JarvisCallModalProps) {
  const [callState, setCallState] = useState<"ringing" | "connected" | "ended">("ringing");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [statusText, setStatusText] = useState("Incoming Call from Jarvis...");
  const [transcriptHistory, setTranscriptHistory] = useState<
    Array<{ sender: "user" | "jarvis"; text: string; time: string }>
  >([]);
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [livekitConnected, setLivekitConnected] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneTimerRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Play synthetic telephone ringtone using Web Audio API
  const playRingtoneBeep = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(440, ctx.currentTime); // 440 Hz
      osc2.frequency.setValueAtTime(480, ctx.currentTime); // 480 Hz (Standard US/International ringback tone)

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);
    } catch (e) {}
  };

  const playHangupTone = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(480, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  };

  // Ringing state timer
  useEffect(() => {
    if (!isOpen) {
      cleanupCall();
      return;
    }

    setCallState("ringing");
    setStatusText("Academic AI • Jarvis is calling you...");

    // Vibrate device if supported
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([400, 200, 400, 200, 400]);
      } catch (e) {}
    }

    playRingtoneBeep();
    ringtoneTimerRef.current = setInterval(() => {
      playRingtoneBeep();
    }, 2800);

    return () => {
      if (ringtoneTimerRef.current) clearInterval(ringtoneTimerRef.current);
    };
  }, [isOpen]);

  // Duration timer when connected
  useEffect(() => {
    if (callState === "connected") {
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState]);

  const speakAiResponse = (text: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    synthesisUtteranceRef.current = utterance;

    // Pick best natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha")) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0];

    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsAiSpeaking(true);
      setStatusText("Jarvis is speaking...");
    };

    utterance.onend = () => {
      setIsAiSpeaking(false);
      setStatusText("Listening to you...");
      if (onEnd) onEnd();
      startListening();
    };

    utterance.onerror = () => {
      setIsAiSpeaking(false);
      setStatusText("Listening to you...");
      if (onEnd) onEnd();
      startListening();
    };

    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (callState === "ended") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsUserSpeaking(true);
        setStatusText("Listening to you...");
      };

      recognition.onresult = async (event: any) => {
        setIsUserSpeaking(false);
        const spokenText = event.results[0][0].transcript;
        if (!spokenText.trim()) return;

        // Add user speech to transcript
        const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setTranscriptHistory((prev) => [...prev, { sender: "user", text: spokenText, time: nowTime }]);
        setStatusText("Jarvis is thinking...");

        // Query AI Voice endpoint
        try {
          const res = await fetch("/api/voice/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: spokenText }),
          });
          const data = await res.json();
          const responseSpeech = data.success ? data.text : "I had trouble processing that. Could you repeat?";

          setTranscriptHistory((prev) => [
            ...prev,
            { sender: "jarvis", text: responseSpeech, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
          ]);

          speakAiResponse(responseSpeech);
        } catch (err) {
          speakAiResponse("Network error. Please say that again.");
        }
      };

      recognition.onerror = (err: any) => {
        setIsUserSpeaking(false);
        if (err.error !== "no-speech") {
          console.error("Speech recognition error:", err);
        }
        // Auto-restart listening if call still connected
        setTimeout(() => {
          if (callState === "connected" && !isAiSpeaking) {
            startListening();
          }
        }, 800);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {}
  };

  const handleAnswerCall = async () => {
    if (ringtoneTimerRef.current) clearInterval(ringtoneTimerRef.current);
    setCallState("connected");
    setStatusText("Connecting LiveKit WebRTC room...");

    // 1. Connect to LiveKit Room
    try {
      const res = await fetch("/api/livekit/token");
      const data = await res.json();

      if (data.success && data.token && data.url) {
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = room;

        room.on(RoomEvent.Connected, () => {
          setLivekitConnected(true);
        });

        await room.connect(data.url, data.token);

        // Publish local mic track to LiveKit
        await room.localParticipant.setMicrophoneEnabled(true);
        setLivekitConnected(true);
      }
    } catch (livekitErr) {
      console.warn("LiveKit direct connect fallback to browser audio:", livekitErr);
    }

    // 2. Initial Jarvis Spoken Greeting
    const greeting =
      autoGreeting ||
      `Hello ${userName}! This is Jarvis, your academic assistant. How can I help you with your attendance, timetable, or exams today?`;

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setTranscriptHistory([{ sender: "jarvis", text: greeting, time: nowTime }]);

    speakAiResponse(greeting, () => {
      startListening();
    });
  };

  const handleEndCall = () => {
    cleanupCall();
    playHangupTone();
    setCallState("ended");
    setStatusText("Call Ended.");
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const cleanupCall = () => {
    if (ringtoneTimerRef.current) clearInterval(ringtoneTimerRef.current);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    setIsAiSpeaking(false);
    setIsUserSpeaking(false);
    setLivekitConnected(false);
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300">
      <div
        className={`w-full max-w-lg overflow-hidden rounded-3xl border bg-card/95 shadow-2xl backdrop-blur-xl transition-all duration-300 flex flex-col ${
          isMinimized ? "max-h-24 p-4" : "max-h-[92vh] h-[640px]"
        }`}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b px-5 py-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-extrabold uppercase tracking-wider text-foreground">
              J.A.R.V.I.S. • Live Voice
            </span>
            {livekitConnected && (
              <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[9px] font-bold text-blue-500">
                LiveKit WebRTC
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={handleEndCall}
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ─── State 1: Incoming Ringing Call ─── */}
        {callState === "ringing" && (
          <div className="flex-1 flex flex-col items-center justify-between p-8 text-center">
            <div className="space-y-3 pt-6">
              {/* Glowing Pulse Rings */}
              <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-primary/30 animate-pulse" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/30">
                  <Bot className="h-10 w-10 animate-bounce" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-foreground">Academic AI Jarvis</h3>
                <p className="text-xs text-muted-foreground animate-pulse">Incoming Voice Call...</p>
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground max-w-xs">
              ⚡ Speaks with verified MongoDB schedule, bunk buffers, and exam dates.
            </div>

            {/* Answer / Decline Actions */}
            <div className="flex items-center justify-center gap-10 w-full pb-4">
              <button
                onClick={handleEndCall}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-500/30 group-hover:bg-red-700 transition-all group-hover:scale-110">
                  <PhoneOff className="h-7 w-7" />
                </div>
                <span className="text-xs font-bold text-muted-foreground">Decline</span>
              </button>

              <button
                onClick={handleAnswerCall}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 group-hover:bg-emerald-700 transition-all group-hover:scale-110 animate-bounce">
                  <Phone className="h-7 w-7" />
                </div>
                <span className="text-xs font-bold text-emerald-500">Answer</span>
              </button>
            </div>
          </div>
        )}

        {/* ─── State 2: Active Connected Call ─── */}
        {callState === "connected" && !isMinimized && (
          <div className="flex-1 flex flex-col justify-between p-6">
            {/* Header info & timer */}
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h4 className="font-extrabold text-sm text-foreground">Academic Assistant • Connected</h4>
                <p className="text-[11px] text-muted-foreground">{statusText}</p>
              </div>
              <div className="font-mono text-xs font-bold text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                {formatDuration(callDuration)}
              </div>
            </div>

            {/* Live Audio Oscillating Waveform */}
            <div className="my-auto flex flex-col items-center justify-center py-6 space-y-4">
              <div className="flex items-center gap-1.5 h-16">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((bar) => {
                  const isActive = isAiSpeaking || isUserSpeaking;
                  const height = isActive
                    ? `${Math.max(16, Math.sin(bar * 0.8 + callDuration * 2) * 55 + 25)}px`
                    : "8px";
                  return (
                    <div
                      key={bar}
                      className={`w-1.5 rounded-full transition-all duration-150 ${
                        isAiSpeaking
                          ? "bg-gradient-to-t from-blue-500 to-indigo-500"
                          : isUserSpeaking
                          ? "bg-emerald-500"
                          : "bg-muted"
                      }`}
                      style={{ height }}
                    />
                  );
                })}
              </div>

              <div className="text-center">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                    isAiSpeaking
                      ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                      : isUserSpeaking
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  <span>{isAiSpeaking ? "Jarvis Speaking..." : isUserSpeaking ? "You are Speaking..." : "Listening..."}</span>
                </span>
              </div>
            </div>

            {/* Conversation Transcript Feed */}
            <div className="rounded-2xl border bg-muted/30 p-3 h-40 overflow-y-auto space-y-2 text-xs">
              {transcriptHistory.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-xs">
                  Speak into your microphone to talk to Jarvis...
                </p>
              ) : (
                transcriptHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 ${
                      msg.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.sender === "jarvis" && (
                      <Bot className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    )}
                    <div
                      className={`rounded-xl px-3 py-1.5 max-w-[85%] text-[11px] leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-primary text-primary-foreground font-medium"
                          : "bg-card border text-foreground"
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.sender === "user" && (
                      <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* In-Call Controls */}
            <div className="flex items-center justify-around pt-4 border-t">
              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (roomRef.current) {
                    roomRef.current.localParticipant.setMicrophoneEnabled(isMuted);
                  }
                }}
                className={`p-3 rounded-full border transition-all ${
                  isMuted ? "bg-red-500 text-white border-red-600" : "bg-card text-foreground hover:bg-muted"
                }`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>

              <button
                onClick={handleEndCall}
                className="flex items-center gap-2 rounded-full bg-red-600 hover:bg-red-700 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105"
              >
                <PhoneOff className="h-4 w-4" />
                <span>End Call</span>
              </button>

              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`p-3 rounded-full border transition-all ${
                  !isSpeakerOn ? "bg-muted text-muted-foreground" : "bg-card text-foreground hover:bg-muted"
                }`}
                title={isSpeakerOn ? "Speaker Muted" : "Speaker On"}
              >
                {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </button>
            </div>
          </div>
        )}

        {/* ─── State 3: Call Ended ─── */}
        {callState === "ended" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <PhoneOff className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-foreground">Call Finished</h4>
              <p className="text-xs text-muted-foreground">Duration: {formatDuration(callDuration)}</p>
            </div>
            <p className="text-[11px] text-muted-foreground">All attendance records and questions discussed were processed.</p>
          </div>
        )}
      </div>
    </div>
  );
}
