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
  Link2,
  Link2Off,
  Copy,
  RefreshCw,
  Target,
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
  });

  // GATE exam settings
  const [gateSettings, setGateSettings] = useState({
    examType: "GATE CS",
    examLabel: "GATE 2027",
    targetYear: 2027,
    targetScore: 65,
  });
  const [savingGate, setSavingGate] = useState(false);

  // Telegram link token flow
  const [linkToken, setLinkToken] = useState("");
  const [linkTokenLoading, setLinkTokenLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [botUsername, setBotUsername] = useState("Academic_hari_bot");
  const [disconnecting, setDisconnecting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testCronRunning, setTestCronRunning] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pushStatus, setPushStatus] = useState<string>("Checking...");

  useEffect(() => {
    loadSettings();
    loadGateSettings();
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
        });
      }
    } catch (err) {
      console.error("Load settings error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadGateSettings = async () => {
    try {
      const res = await fetch("/api/gate/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setGateSettings({
          examType: data.settings.examType || "GATE CS",
          examLabel: data.settings.examLabel || "GATE 2027",
          targetYear: data.settings.targetYear || 2027,
          targetScore: data.settings.targetScore || 65,
        });
      }
    } catch (err) {
      console.error("Load GATE settings error:", err);
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
          setMessage({ type: "success", text: "Browser notification permission granted." });
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

  const handleSaveGateSettings = async () => {
    setSavingGate(true);
    try {
      const res = await fetch("/api/gate/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gateSettings),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Exam planner settings updated! Refresh the GATE Planner page to see changes." });
      } else {
        setMessage({ type: "error", text: data.message || "Failed to save exam settings." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingGate(false);
    }
  };

  // Auto-generate examLabel when examType or targetYear changes
  const handleExamTypeChange = (examType: string) => {
    const year = gateSettings.targetYear;
    const label = examType === "Custom" ? gateSettings.examLabel : `${examType} ${year}`;
    setGateSettings({ ...gateSettings, examType, examLabel: label });
  };

  const handleTargetYearChange = (targetYear: number) => {
    const examType = gateSettings.examType;
    const label = examType === "Custom" ? gateSettings.examLabel : `${examType} ${targetYear}`;
    setGateSettings({ ...gateSettings, targetYear, examLabel: label });
  };

  const handleGenerateLinkToken = async () => {
    setLinkTokenLoading(true);
    setLinkToken("");
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setLinkToken(data.token);
        setBotUsername(data.botUsername || "Academic_hari_bot");
      } else {
        setMessage({ type: "error", text: data.message || "Failed to generate link token." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Failed to generate link token." });
    } finally {
      setLinkTokenLoading(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/telegram/link", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setProfile({ ...profile, telegramChatId: "", notificationPreferences: { ...profile.notificationPreferences, telegram: false } });
        setMessage({ type: "success", text: "Telegram disconnected successfully." });
      } else {
        setMessage({ type: "error", text: data.message || "Failed to disconnect Telegram." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Failed to disconnect Telegram." });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(`/link ${linkToken}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
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
      setMessage({ type: "error", text: "Telegram not connected yet. Connect it first." });
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

  const isTelegramConnected = !!profile.telegramChatId;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary mb-2 border border-primary/20">
            <ShieldCheck className="h-3 w-3" />
            <span>Personal Settings</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Account & Personal Assistant Settings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Configure your student profile, attendance thresholds, exam planner, and notifications.
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
          <div className="rounded-3xl border bg-card p-4 sm:p-6 shadow-sm space-y-4">
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
          <div className="rounded-3xl border bg-card p-4 sm:p-6 shadow-sm space-y-4">
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

          {/* Submit profile */}
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
              <span>Save Profile</span>
            </button>
          </div>
        </form>

        {/* Exam Planner Settings */}
        <div className="rounded-3xl border bg-card p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="font-bold text-sm text-foreground">Exam Planner Identity</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Customize which exam you are preparing for. This updates the sidebar label and planner display.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Exam Type</label>
              <select
                value={gateSettings.examType}
                onChange={(e) => handleExamTypeChange(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
              >
                <option>GATE CS</option>
                <option>GATE DA</option>
                <option>GATE ECE</option>
                <option>GATE EE</option>
                <option>GATE ME</option>
                <option>GATE CE</option>
                <option>UPSC</option>
                <option>CAT</option>
                <option>GRE</option>
                <option>Custom</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Target Year</label>
              <select
                value={gateSettings.targetYear}
                onChange={(e) => handleTargetYearChange(Number(e.target.value))}
                className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
              >
                {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Sidebar Label</label>
              <input
                type="text"
                value={gateSettings.examLabel}
                onChange={(e) => setGateSettings({ ...gateSettings, examLabel: e.target.value })}
                placeholder="e.g. GATE CS 2027"
                className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
              />
              <p className="text-[10px] text-muted-foreground">This label appears in the sidebar and planner header.</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Target Score</label>
              <input
                type="number"
                min={1}
                max={100}
                value={gateSettings.targetScore}
                onChange={(e) => setGateSettings({ ...gateSettings, targetScore: Number(e.target.value) })}
                className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
              />
              <p className="text-[10px] text-muted-foreground">Your target score out of 100 (GATE is out of 100 marks).</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={savingGate}
              onClick={handleSaveGateSettings}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {savingGate ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-3.5 w-3.5" />}
              Save Exam Settings
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-3xl border bg-card p-4 sm:p-6 shadow-sm space-y-5">
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
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 rounded-2xl border p-3.5 sm:p-4 bg-muted/20">
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
                className="rounded-xl border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted shrink-0 w-full xs:w-auto text-center"
              >
                Enable Push
              </button>
            </div>

            {/* Telegram Integration — Token-based linking */}
            <div className="rounded-2xl border p-3.5 sm:p-4 bg-muted/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-sky-500" />
                  <span className="font-bold text-foreground">Telegram Notifications</span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    isTelegramConnected
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : "bg-muted text-muted-foreground border"
                  }`}
                >
                  {isTelegramConnected ? "✓ Connected" : "Not Connected"}
                </span>
              </div>

              {isTelegramConnected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-3 py-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-foreground">Telegram linked</div>
                      <div className="text-[10px] text-muted-foreground">Chat ID: {profile.telegramChatId}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={testingTelegram}
                      onClick={handleSendTestTelegram}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 px-3.5 py-2 text-[11px] font-bold text-white disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {testingTelegram ? "Sending..." : "Send Test Message"}
                    </button>

                    <button
                      type="button"
                      disabled={disconnecting}
                      onClick={handleDisconnectTelegram}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 px-3.5 py-2 text-[11px] font-bold text-destructive disabled:opacity-50"
                    >
                      <Link2Off className="h-3.5 w-3.5" />
                      {disconnecting ? "Disconnecting..." : "Disconnect Telegram"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-[11px]">
                    Connect your personal Telegram to receive 4 PM attendance check-in reminders and exam planner alerts directly on your phone.
                  </p>

                  <div className="rounded-xl border bg-background p-3 space-y-2">
                    <div className="font-semibold text-foreground text-[11px]">How to connect:</div>
                    <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Click <strong>"Generate Link Token"</strong> below</li>
                      <li>
                        Open Telegram and tap{" "}
                        <a
                          href={`https://t.me/${botUsername}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-sky-500 underline hover:text-sky-400"
                        >
                          @{botUsername}
                        </a>
                      </li>
                      <li>Send the command shown below to the bot</li>
                      <li>Your Telegram will be linked instantly ✅</li>
                    </ol>
                  </div>

                  <button
                    type="button"
                    disabled={linkTokenLoading}
                    onClick={handleGenerateLinkToken}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {linkTokenLoading ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    {linkTokenLoading ? "Generating..." : "Generate Link Token"}
                  </button>

                  {linkToken && (
                    <div className="rounded-xl border bg-sky-500/5 border-sky-500/20 p-3 space-y-2">
                      <div className="text-[11px] text-muted-foreground font-semibold">Send this command to the bot:</div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs font-mono text-foreground">
                          /link {linkToken}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyToken}
                          className="rounded-lg border p-2 hover:bg-muted transition-colors"
                          title="Copy command"
                        >
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                      {linkCopied && <p className="text-[10px] text-emerald-500">Copied to clipboard!</p>}
                      <p className="text-[10px] text-amber-500">⏱ This token expires in 15 minutes.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Optional: Enable telegram toggle after connecting */}
              {isTelegramConnected && (
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="text-xs font-semibold text-foreground">Receive daily notifications</div>
                    <p className="text-[10px] text-muted-foreground">Get 4 PM check-in reminders and alerts via Telegram</p>
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
              )}
            </div>

            {/* Manual Checkin Test Trigger */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3.5 sm:p-4 bg-primary/5 border-primary/20">
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

        {/* Save profile button for notification preferences */}
        <div className="flex justify-end pb-8">
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveProfile as any}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-3 text-xs font-bold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Save Notification Preferences</span>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
