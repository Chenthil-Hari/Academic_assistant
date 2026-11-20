"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Bell,
  Send,
  User,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Globe,
  Sliders,
  Volume2,
} from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    college: "",
    branch: "",
    semester: 1,
    rollNumber: "",
    targetAttendancePercentage: 75,
    notificationPreferences: {
      webPush: true,
      telegram: false,
      dailyCheckinTime: "16:00",
      timezone: "Asia/Kolkata",
    },
    telegramChatId: "",
    assistantVoice: "en-IN-NeerjaNeural",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testCronRunning, setTestCronRunning] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pushStatus, setPushStatus] = useState<string>("Checking...");

  useEffect(() => {
    loadSettings();
    checkPushSupport();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.user) {
        setProfile({
          name: data.user.name || "",
          email: data.user.email || "",
          college: data.user.college || "",
          branch: data.user.branch || "",
          semester: data.user.semester || 1,
          rollNumber: data.user.rollNumber || "",
          targetAttendancePercentage: data.user.targetAttendancePercentage || 75,
          notificationPreferences: {
            webPush: data.user.notificationPreferences?.webPush ?? true,
            telegram: data.user.notificationPreferences?.telegram ?? false,
            dailyCheckinTime: data.user.notificationPreferences?.dailyCheckinTime || "16:00",
            timezone: data.user.notificationPreferences?.timezone || "Asia/Kolkata",
          },
          telegramChatId: data.user.telegramChatId || "",
          assistantVoice: data.user.assistantVoice || "en-IN-NeerjaNeural",
        });
      }
    } catch (err) {
      console.error("Load settings error:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkPushSupport = () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushStatus("Not supported in this browser");
    } else {
      setPushStatus(Notification.permission);
    }
  };

  const handleRequestPushPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setMessage({ type: "error", text: "Browser notifications not supported in this browser." });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);

      if (permission === "granted" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        // Fetch public VAPID key
        const vapidRes = await fetch("/api/notifications/subscribe");
        const { publicKey } = await vapidRes.json();

        if (publicKey) {
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicKey,
          });

          await fetch("/api/notifications/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription: sub }),
          });

          setMessage({ type: "success", text: "Push notification subscription activated!" });
        } else {
          setMessage({
            type: "success",
            text: "Browser notification permission granted.",
          });
        }
      }
    } catch (err: any) {
      console.error("Push subscription error:", err);
      setMessage({ type: "error", text: "Could not complete push subscription." });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update settings.");
      }

      setMessage({ type: "success", text: "Settings saved successfully." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error saving settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerTestCheckin = async () => {
    setTestCronRunning(true);
    setMessage(null);

    try {
      const res = await fetch("/api/cron/daily-checkin", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: `Daily check-in test completed successfully for ${data.results?.length || 1} user(s). Check your notifications!`,
        });
      } else {
        setMessage({ type: "error", text: data.message || "Check-in test failed." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Failed to trigger daily check-in." });
    } finally {
      setTestCronRunning(false);
    }
  };

  const handleSendTestTelegram = async () => {
    if (!profile.telegramChatId.trim()) {
      setMessage({ type: "error", text: "Please enter your Telegram Chat ID first." });
      return;
    }

    setTestingTelegram(true);
    setMessage(null);

    try {
      const res = await fetch("/api/notifications/test-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: profile.telegramChatId.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message });
      } else {
        setMessage({ type: "error", text: data.message || "Failed to deliver Telegram test message." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Failed to connect to Telegram test endpoint." });
    } finally {
      setTestingTelegram(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary mb-2 border border-primary/20">
            <ShieldCheck className="h-3 w-3" />
            <span>Personal Edition • Single-User Mode Active</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Account & Personal Assistant Settings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Configure your student profile, attendance thresholds, 4:00 PM IST check-in triggers and notifications.
          </p>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2.5 rounded-2xl p-3.5 text-xs border ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Profile Details */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <User className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-sm text-foreground">Student Profile Details</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Full Name</label>
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full rounded-xl border bg-muted/50 px-3 py-2 text-muted-foreground cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">College / University</label>
                <input
                  type="text"
                  value={profile.college}
                  onChange={(e) => setProfile({ ...profile, college: e.target.value })}
                  placeholder="e.g. National Institute of Tech"
                  className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Branch / Major</label>
                <input
                  type="text"
                  value={profile.branch}
                  onChange={(e) => setProfile({ ...profile, branch: e.target.value })}
                  placeholder="e.g. Computer Science"
                  className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Semester</label>
                <select
                  value={profile.semester}
                  onChange={(e) => setProfile({ ...profile, semester: Number(e.target.value) })}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Roll / Registration Number</label>
                <input
                  type="text"
                  value={profile.rollNumber}
                  onChange={(e) => setProfile({ ...profile, rollNumber: e.target.value })}
                  placeholder="e.g. 21CS042"
                  className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Attendance Criteria */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Sliders className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-sm text-foreground">Attendance Thresholds & Rules</h2>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <label className="text-foreground">Target Attendance Requirement</label>
                  <span className="text-primary font-bold">{profile.targetAttendancePercentage}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={1}
                  value={profile.targetAttendancePercentage}
                  onChange={(e) =>
                    setProfile({ ...profile, targetAttendancePercentage: Number(e.target.value) })
                  }
                  className="w-full accent-primary cursor-pointer"
                />
                <p className="text-muted-foreground text-[11px]">
                  Bunk calculations, safety alerts, and safe zone markers will calibrate against this benchmark.
                </p>
              </div>
            </div>
          </div>

          {/* 4 PM Check-in & Notifications */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h2 className="font-bold text-sm text-foreground">Daily 4:00 PM Check-in & Alerts</h2>
              </div>
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                Asia/Kolkata
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Web Push */}
              <div className="flex items-start justify-between rounded-2xl border p-4 bg-muted/20">
                <div className="space-y-1">
                  <div className="font-bold text-foreground">Browser & Device Web Push</div>
                  <p className="text-muted-foreground text-[11px]">
                    Receive push notification prompt every day at 4:00 PM IST with your daily checklist.
                  </p>
                  <div className="text-[10px] text-muted-foreground">
                    Current status: <strong>{pushStatus}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRequestPushPermission}
                  className="rounded-xl border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Enable Push
                </button>
              </div>

              {/* Telegram Integration */}
              <div className="rounded-2xl border p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-sky-500" />
                    <span className="font-bold text-foreground">Telegram Alerts (Optional)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.notificationPreferences.telegram}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        notificationPreferences: {
                          ...profile.notificationPreferences,
                          telegram: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                </div>

                <p className="text-muted-foreground text-[11px]">
                  Receive your 4 PM checklist and low attendance alerts directly to your Telegram handle or group.
                </p>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground">Telegram Chat ID</label>
                    {profile.telegramChatId && (
                      <button
                        type="button"
                        disabled={testingTelegram}
                        onClick={handleSendTestTelegram}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:underline disabled:opacity-50"
                      >
                        {testingTelegram ? "Sending..." : "Send Test Alert 🚀"}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={profile.telegramChatId}
                    onChange={(e) => setProfile({ ...profile, telegramChatId: e.target.value })}
                    placeholder="e.g. 123456789"
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Message your bot or <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-primary underline">@userinfobot</a> on Telegram to get your numeric Chat ID.
                  </p>
                </div>
              </div>

              {/* AI Voice Assistant Selection */}
              <div className="rounded-2xl border p-4 bg-muted/20 space-y-3">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-primary" />
                  <span className="font-bold text-foreground">AI Speaking Voice (Telegram & Voice Notes)</span>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Choose which natural voice your AI uses when speaking back to you in voice notes.
                </p>
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Voice Persona</label>
                  <select
                    value={profile.assistantVoice}
                    onChange={(e) => setProfile({ ...profile, assistantVoice: e.target.value })}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                  >
                    <option value="en-IN-NeerjaNeural">🇮🇳 Neerja (Indian English Female) • Recommended</option>
                    <option value="en-IN-PrabhatNeural">🇮🇳 Prabhat (Indian English Male)</option>
                    <option value="en-GB-RyanNeural">🇬🇧 Jarvis / Ryan (British English Male)</option>
                    <option value="en-US-ChristopherNeural">🇺🇸 Christopher (US Deep Male)</option>
                    <option value="en-US-JennyNeural">🇺🇸 Jenny (US Female)</option>
                    <option value="en-US-GuyNeural">🇺🇸 Guy (US Male)</option>
                  </select>
                </div>
              </div>

              {/* Manual Checkin Test Trigger */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 bg-primary/5 border-primary/20">
                <div className="space-y-1">
                  <div className="font-bold text-foreground">Test Daily 4:00 PM Check-in</div>
                  <p className="text-muted-foreground text-[11px]">
                    Simulate the automated 4:00 PM IST backend check-in engine right now.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={testCronRunning}
                  onClick={handleTriggerTestCheckin}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 shrink-0"
                >
                  {testCronRunning ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                  <span>Trigger Now</span>
                </button>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-3 text-xs font-bold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
