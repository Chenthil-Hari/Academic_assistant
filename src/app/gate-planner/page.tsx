"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Target,
  Clock,
  Video,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Flame,
  TrendingUp,
  BarChart3,
  BookOpen,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
  Layers,
  FileQuestion,
  HelpCircle,
  Edit2,
  Check,
  ChevronRight,
  ArrowRight,
  ShieldAlert,
  Sliders,
  CalendarDays,
  BookmarkCheck,
  Info,
  Send,
} from "lucide-react";
import { GateCountdownMotivationCard } from "@/components/gate/GateCountdownMotivationCard";

export default function GatePlannerPage() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "schedule" | "tracker" | "subjects" | "analytics" | "pyq" | "settings"
  >("overview");

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [pyqData, setPyqData] = useState<any>(null);
  const [mistakesData, setMistakesData] = useState<any>(null);
  const [progressLogs, setProgressLogs] = useState<any[]>([]);

  // Modals & form state
  const [showLogModal, setShowLogModal] = useState(false);
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showAddMistakeModal, setShowAddMistakeModal] = useState(false);
  const [showAddPYQModal, setShowAddPYQModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);

  const [newSubjectForm, setNewSubjectForm] = useState({
    name: "",
    code: "",
    remainingVideos: 20,
    averageVideoDuration: 1.5,
    priority: "High" as "High" | "Medium" | "Low",
    color: "#3B82F6",
  });

  // Form inputs
  const [logForm, setLogForm] = useState({
    subjectId: "",
    videosCompleted: 1,
    hoursStudied: 1.5,
    topicsCovered: "",
    notes: "",
  });

  const [rescheduleForm, setRescheduleForm] = useState({
    missedHours: 2.0,
    subjectId: "",
  });

  const [pyqForm, setPyqForm] = useState({
    subjectId: "",
    topic: "",
    year: 2024,
    questionsAttempted: 15,
    correctAnswers: 12,
    timeTakenMinutes: 30,
    difficulty: "Medium",
    revisionStatus: "Pending Review",
    notes: "",
  });

  const [mistakeForm, setMistakeForm] = useState({
    subjectId: "",
    topic: "",
    questionDetails: "",
    myMistake: "",
    correctConcept: "",
    gateYear: "GATE 2023",
  });

  const [settingsForm, setSettingsForm] = useState({
    examType: "GATE CS",
    examLabel: "GATE 2027",
    targetYear: 2027,
    targetScore: 65,
    studyStyle: "videos" as "videos" | "chapters" | "topics" | "problems" | "hours",
    gateExamDate: "2027-02-06",
    phase1Deadline: "2026-12-31",
    dailyStudyHours: 10,
    studyDaysPerWeek: 6,
    playbackSpeed: 1.0,
    currentPhase: "Phase 1 - Lectures & Concept",
  });

  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 5000);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Overview & Workload
      const resOverview = await fetch("/api/gate/overview");
      const dataOverview = await resOverview.json();
      if (dataOverview.success) {
        setOverview(dataOverview);
        if (dataOverview.settings) {
          setSettingsForm({
            examType: dataOverview.settings.examType || "GATE CS",
            examLabel: dataOverview.settings.examLabel || "GATE 2027",
            targetYear: dataOverview.settings.targetYear || 2027,
            targetScore: dataOverview.settings.targetScore || 65,
            studyStyle: dataOverview.settings.studyStyle || "videos",
            gateExamDate: dataOverview.settings.gateExamDate
              ? new Date(dataOverview.settings.gateExamDate).toISOString().split("T")[0]
              : "2027-02-06",
            phase1Deadline: dataOverview.settings.phase1Deadline
              ? new Date(dataOverview.settings.phase1Deadline).toISOString().split("T")[0]
              : "2026-12-31",
            dailyStudyHours: dataOverview.settings.dailyStudyHours || 10,
            studyDaysPerWeek: dataOverview.settings.studyDaysPerWeek || 6,
            playbackSpeed: dataOverview.settings.playbackSpeed || 1.0,
            currentPhase: dataOverview.settings.currentPhase || "Phase 1 - Lectures & Concept",
          });
        }
      }

      // 2. Schedule
      const resSched = await fetch("/api/gate/schedule?days=14");
      const dataSched = await resSched.json();
      if (dataSched.success) setScheduleData(dataSched);

      // 3. Analytics
      const resAnalytics = await fetch("/api/gate/analytics");
      const dataAnalytics = await resAnalytics.json();
      if (dataAnalytics.success) setAnalyticsData(dataAnalytics);

      // 4. Progress Logs
      const resProg = await fetch("/api/gate/progress?limit=20");
      const dataProg = await resProg.json();
      if (dataProg.success) setProgressLogs(dataProg.logs || []);

      // 5. PYQ Data
      const resPYQ = await fetch("/api/gate/pyq");
      const dataPYQ = await resPYQ.json();
      if (dataPYQ.success) setPyqData(dataPYQ);

      // 6. Mistakes Data
      const resMistakes = await fetch("/api/gate/mistakes");
      const dataMistakes = await resMistakes.json();
      if (dataMistakes.success) setMistakesData(dataMistakes);
    } catch (err: any) {
      console.error("Error loading GATE planner data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logForm.subjectId) return;

    try {
      const res = await fetch("/api/gate/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logForm),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || "Progress logged successfully!");
        setShowLogModal(false);
        setLogForm({ subjectId: "", videosCompleted: 1, hoursStudied: 1.5, topicsCovered: "", notes: "" });
        loadAllData();
      } else {
        showNotification(data.message || "Failed to log progress", "error");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const [sendingTelegram, setSendingTelegram] = useState(false);
  const handleSendTelegramBriefing = async () => {
    setSendingTelegram(true);
    try {
      const res = await fetch("/api/cron/gate-daily?mode=morning&force=true", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showNotification("Automated GATE study briefing sent to your Telegram! 📲");
      } else {
        showNotification(data.message || "Failed to deliver Telegram alert", "error");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setSendingTelegram(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/gate/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSubjectForm,
          initialVideos: newSubjectForm.remainingVideos,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Added ${newSubjectForm.name}`);
        setShowAddSubjectModal(false);
        setNewSubjectForm({
          name: "",
          code: "",
          remainingVideos: 20,
          averageVideoDuration: 1.5,
          priority: "High",
          color: "#3B82F6",
        });
        loadAllData();
      } else {
        showNotification(data.message || "Failed to add subject", "error");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;

    try {
      const res = await fetch(`/api/gate/subjects/${selectedSubject.id || selectedSubject._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedSubject),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Updated ${selectedSubject.name}`);
        setShowEditSubjectModal(false);
        loadAllData();
      } else {
        showNotification(data.message || "Failed to update subject", "error");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/gate/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule_missed",
          missedHours: rescheduleForm.missedHours,
          subjectId: rescheduleForm.subjectId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || "Rescheduled successfully!");
        setShowRescheduleModal(false);
        loadAllData();
      } else {
        showNotification(data.message || "Failed to reschedule", "error");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleInitTemplate = async (reset = false) => {
    try {
      const res = await fetch(`/api/gate/init${reset ? "?action=reset" : ""}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || "GATE CS syllabus template loaded!");
        loadAllData();
      } else {
        showNotification(data.message || "Failed to load template", "error");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/gate/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("Study constraints and playback speed saved!");
        loadAllData();
      } else {
        showNotification(data.message || "Failed to save settings", "error");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleAddPYQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pyqForm.subjectId || !pyqForm.topic) return;

    try {
      const res = await fetch("/api/gate/pyq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pyqForm),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("PYQ practice session recorded!");
        setShowAddPYQModal(false);
        setPyqForm({
          subjectId: "",
          topic: "",
          year: 2024,
          questionsAttempted: 15,
          correctAnswers: 12,
          timeTakenMinutes: 30,
          difficulty: "Medium",
          revisionStatus: "Pending Review",
          notes: "",
        });
        loadAllData();
      } else {
        showNotification(data.message || "Failed to record PYQ", "error");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleAddMistake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mistakeForm.subjectId || !mistakeForm.topic || !mistakeForm.myMistake || !mistakeForm.correctConcept) return;

    try {
      const res = await fetch("/api/gate/mistakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mistakeForm),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("Added mistake to your Mistake Notebook!");
        setShowAddMistakeModal(false);
        setMistakeForm({
          subjectId: "",
          topic: "",
          questionDetails: "",
          myMistake: "",
          correctConcept: "",
          gateYear: "GATE 2023",
        });
        loadAllData();
      } else {
        showNotification(data.message || "Failed to add mistake", "error");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleToggleMistakeReviewed = async (id: string, current: boolean) => {
    try {
      const res = await fetch("/api/gate/mistakes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isReviewed: !current }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(!current ? "Marked concept as reviewed! 🎉" : "Marked as pending review.");
        loadAllData();
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleResetToDefaults = async () => {
    if (!confirm("Are you sure you want to reset all 14 subjects back to initial lecture counts?")) return;
    try {
      const res = await fetch("/api/gate/init?action=reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showNotification("Reset all GATE subjects to initial data!");
        loadAllData();
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const w = overview?.workload || {
    totalInitialVideos: 0,
    totalRemainingVideos: 0,
    totalRemainingHours: 0,
    totalCompletedVideos: 0,
    overallCompletionPercentage: 0,
    daysRemainingUntilDeadline: 0,
    effectiveStudyDays: 0,
    totalAvailableStudyHours: 0,
    dailyRequiredLectureHours: 0,
    workloadGapHours: 0,
    isFeasibleByDeadline: true,
    feasibilityVerdict: "",
    recommendations: [],
    subjects: [],
  };

  const deadlineShort = settingsForm.phase1Deadline
    ? new Date(settingsForm.phase1Deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "Dec 31";

  const studyUnitMap = {
    videos: {
      singular: "Video",
      plural: "Videos",
      remainingTitle: "Remaining Videos",
      hoursTitle: "Lecture Hours",
      hoursSub: `@ ${settingsForm.playbackSpeed}x playback speed`,
    },
    chapters: {
      singular: "Chapter",
      plural: "Chapters",
      remainingTitle: "Remaining Chapters",
      hoursTitle: "Study Hours",
      hoursSub: "Textbook & notes study",
    },
    topics: {
      singular: "Topic",
      plural: "Topics",
      remainingTitle: "Remaining Topics",
      hoursTitle: "Study Hours",
      hoursSub: "Syllabus & concept mastery",
    },
    problems: {
      singular: "Problem Set",
      plural: "Problem Sets",
      remainingTitle: "Remaining Sets",
      hoursTitle: "Practice Hours",
      hoursSub: "Problem solving & drills",
    },
    hours: {
      singular: "Session",
      plural: "Sessions",
      remainingTitle: "Remaining Sessions",
      hoursTitle: "Study Hours",
      hoursSub: "Time-blocked study plan",
    },
  };
  const unitLabels = studyUnitMap[settingsForm.studyStyle || "videos"] || studyUnitMap.videos;

  const isJanuary2027 = overview?.settings?.currentPhase === "Phase 2 - PYQ Practice" || new Date() >= new Date("2027-01-01");

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Toast / Notification Banner */}
        {actionMessage && (
          <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md border animate-in slide-in-from-top duration-300 ${
              actionMessage.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400"
            }`}
          >
            {actionMessage.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            <span className="text-sm font-semibold">{actionMessage.text}</span>
          </div>
        )}

        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-purple-600/10 p-5 sm:p-8 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
                  <Target className="h-3.5 w-3.5" />
                  {settingsForm.examType || "GATE CS"} {settingsForm.targetYear || 2027} Strategy
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Clock className="h-3.5 w-3.5" />
                  Phase 1 Deadline: {settingsForm.phase1Deadline ? new Date(settingsForm.phase1Deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Dec 31, 2026"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  Target Score: {settingsForm.targetScore || 65}/100
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {settingsForm.examLabel || "GATE 2027"} Preparation Planner
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                Personalized study operating system with automatic workload tracking, intelligent {settingsForm.dailyStudyHours || 10}h/day scheduling,
                priority-driven lecture completion, and dedicated PYQ practice.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={() => setShowLogModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 transition-all"
              >
                <Plus className="h-4 w-4" />
                Log Study Today
              </button>
              <button
                onClick={() => setShowRescheduleModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl border bg-card/80 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Reschedule Missed
              </button>
              <button
                onClick={handleSendTelegramBriefing}
                disabled={sendingTelegram}
                title="Send today's automated study target and schedule to your Telegram bot"
                className="inline-flex items-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {sendingTelegram ? "Sending..." : "Telegram Briefing"}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b pb-2 pt-1 scrollbar-none text-xs sm:text-sm">
          {[
            { key: "overview", label: "Overview & Workload", icon: BarChart3 },
            { key: "schedule", label: "Study Schedule", icon: CalendarDays },
            { key: "tracker", label: "Daily Study Tracker", icon: Flame },
            { key: "subjects", label: "Subjects & Priorities", icon: Layers },
            { key: "analytics", label: "Analytics & Trends", icon: TrendingUp },
            { key: "pyq", label: "January PYQ & Mistakes", icon: FileQuestion, badge: "Jan '27" },
            { key: "settings", label: "Settings", icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`group flex items-center gap-2 rounded-2xl px-4 py-2 font-semibold transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                      isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Empty State Onboarding for New Users */}
        {w && (!w.subjects || w.subjects.length === 0) && (
          <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-indigo-500/5 p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <h2 className="text-lg sm:text-xl font-extrabold text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Set Up Your Personal Exam Planner
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                  Your planner starts fresh! Customize your target exam &amp; year in Settings, add your own subjects, or load the standard GATE CS syllabus template to get started.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5 shrink-0">
                <button
                  onClick={() => setActiveTab("settings")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <Sliders className="h-4 w-4" />
                  Customize Exam &amp; Year
                </button>
                <button
                  onClick={() => setActiveTab("subjects")}
                  className="inline-flex items-center gap-2 rounded-2xl border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                  Add Subjects
                </button>
                <button
                  onClick={() => handleInitTemplate(false)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs font-bold text-primary hover:bg-primary/20"
                >
                  <BookOpen className="h-4 w-4" />
                  Load GATE CS Template
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Exam Countdown & Daily Motivation Widget */}
        <GateCountdownMotivationCard variant="planner" customWorkload={w} examSettings={settingsForm} />

        {/* Top KPI Cards (Always visible on Overview, Tracker, Subjects) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Card 1: Remaining Units */}
          <div className="rounded-3xl border bg-card/60 p-4 sm:p-5 backdrop-blur-sm space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">{unitLabels.remainingTitle}</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Video className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {w.totalRemainingVideos}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">/ {w.totalInitialVideos ?? 0}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {w.totalCompletedVideos} completed ({w.overallCompletionPercentage}%)
            </p>
          </div>

          {/* Card 2: Remaining Hours */}
          <div className="rounded-3xl border bg-card/60 p-4 sm:p-5 backdrop-blur-sm space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">{unitLabels.hoursTitle}</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {w.totalRemainingHours}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">hrs</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {unitLabels.hoursSub}
            </p>
          </div>

          {/* Card 3: Days Remaining to Exam */}
          <div className="rounded-3xl border bg-card/60 p-4 sm:p-5 backdrop-blur-sm space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">To {settingsForm.examLabel || "Exam"}</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Flame className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {w.daysRemainingUntilGateExam ?? 0}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">days</span>
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              {w.daysRemainingUntilDeadline}d to Phase 1 ({deadlineShort})
            </p>
          </div>

          {/* Card 4: Daily Requirement */}
          <div className="rounded-3xl border bg-card/60 p-4 sm:p-5 backdrop-blur-sm space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Daily Needed</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                <Zap className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {w.dailyRequiredLectureHours}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">h/day</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Budget: {settingsForm.dailyStudyHours}h/day cap
            </p>
          </div>

          {/* Card 5: Available Study Hours */}
          <div className="col-span-2 lg:col-span-1 rounded-3xl border bg-card/60 p-4 sm:p-5 backdrop-blur-sm space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Study Capacity</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Flame className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {w.totalAvailableStudyHours}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">hrs</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {w.effectiveStudyDays} days × {settingsForm.dailyStudyHours}h daily
            </p>
          </div>
        </div>

        {/* WORKLOAD GAP & FEASIBILITY ANALYSIS BANNER */}
        {!w.isFeasibleByDeadline && (
          <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 p-5 sm:p-6 backdrop-blur-md space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Intelligent Workload Gap Analysis</span>
                  <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    Deficit: {w.workloadGapHours} Hours
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
                  {w.feasibilityVerdict}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              {w.recommendations?.map((rec: string, i: number) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-2xl bg-background/60 border text-xs leading-relaxed text-foreground/80">
                  <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & SUBJECT PROGRESS */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Subject Cards Grid */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Subject Progress &amp; Completion Status</h2>
                <p className="text-xs text-muted-foreground">Prioritized according to your {settingsForm.examLabel || "Exam"} study plan</p>
              </div>
              <button
                onClick={() => setActiveTab("subjects")}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span>Edit All Subjects</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(w.subjects || []).map((sub: any) => {
                const isHigh = sub.priority === "High";
                const isLow = sub.priority === "Low";
                return (
                  <div
                    key={sub.id || sub.code}
                    className="rounded-3xl border bg-card/60 p-5 backdrop-blur-sm space-y-3.5 hover:border-primary/40 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: sub.color || "#3B82F6" }}
                          />
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {sub.code}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              isHigh
                                ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20"
                                : isLow
                                ? "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {sub.priority} Priority
                          </span>
                        </div>
                        <h3 className="font-extrabold text-foreground group-hover:text-primary transition-colors text-sm sm:text-base">
                          {sub.name}
                        </h3>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedSubject(sub);
                          setShowEditSubjectModal(true);
                        }}
                        className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Edit subject"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-bold text-foreground">{sub.completionPercentage}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, sub.completionPercentage)}%`,
                            backgroundColor: sub.color || "#3B82F6",
                          }}
                        />
                      </div>
                    </div>

                    {/* Stat Badges */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-2.5 rounded-2xl bg-muted/50 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Remaining</span>
                        <p className="font-bold text-foreground">
                          {sub.remainingVideos} videos{" "}
                          <span className="text-muted-foreground font-normal">({sub.remainingHours}h)</span>
                        </p>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-muted/50 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Duration</span>
                        <p className="font-bold text-foreground">{sub.averageVideoDuration}h / video</p>
                      </div>
                    </div>

                    {sub.estimatedCompletionDate && (
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                        <span>Est. Completion:</span>
                        <span className="font-semibold text-foreground">{sub.estimatedCompletionDate}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: STUDY SCHEDULE & CALENDAR VIEW */}
        {/* ========================================================================= */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">Daily & Weekly Study Schedule</h2>
                <p className="text-xs text-muted-foreground">
                  Strict 10 hours/day budget | 6 study days/week | Sundays reserved for rest and formula review
                </p>
              </div>
              <button
                onClick={() => setShowRescheduleModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-muted"
              >
                <RefreshCw className="h-3.5 w-3.5 text-primary" />
                Reschedule Missed Sessions
              </button>
            </div>

            {/* Daily Schedule Cards */}
            <div className="space-y-4">
              {(scheduleData?.days || []).slice(0, 7).map((day: any, dIdx: number) => {
                const isToday = day.date === new Date().toISOString().split("T")[0];
                return (
                  <div
                    key={day.date}
                    className={`rounded-3xl border p-5 backdrop-blur-sm transition-all space-y-3.5 ${
                      isToday
                        ? "border-primary/50 bg-primary/5 shadow-md shadow-primary/10"
                        : day.isRestDay
                        ? "border-slate-500/20 bg-slate-500/5"
                        : "bg-card/60"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-xl font-bold uppercase ${
                            isToday
                              ? "bg-primary text-primary-foreground"
                              : day.isRestDay
                              ? "bg-slate-500/20 text-slate-600 dark:text-slate-400"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {day.dayName}
                        </span>
                        <span className="font-extrabold text-foreground text-sm sm:text-base">{day.date}</span>
                        {isToday && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] px-2 py-0.5 font-bold uppercase">
                            <Flame className="h-3 w-3" /> Today
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-semibold">{day.statusSummary}</span>
                    </div>

                    {/* Slots */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {day.slots?.map((slot: any, sIdx: number) => (
                        <div
                          key={sIdx}
                          className="rounded-2xl border bg-background/70 p-3.5 space-y-2 flex flex-col justify-between"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-muted-foreground tracking-wide">
                                {slot.timeSlot}
                              </span>
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                                style={{ backgroundColor: `${slot.color}20`, color: slot.color }}
                              >
                                {slot.sessionType}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-foreground line-clamp-1">{slot.subjectName}</h4>
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{slot.topics}</p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t text-xs font-semibold">
                            <span className="text-foreground">{slot.plannedHours} hrs</span>
                            {slot.plannedVideos > 0 && (
                              <span className="text-muted-foreground">{slot.plannedVideos} videos</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: DAILY STUDY TRACKER */}
        {/* ========================================================================= */}
        {activeTab === "tracker" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">Daily Study Progress Logger</h2>
                <p className="text-xs text-muted-foreground">
                  Record completed videos, hours studied, and topics to automatically update remaining workload
                </p>
              </div>
              <button
                onClick={() => setShowLogModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Record Study Session
              </button>
            </div>

            {/* Past Logs Table */}
            <div className="rounded-3xl border bg-card/60 backdrop-blur-sm overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-bold text-sm text-foreground">Recent Study Logs</h3>
              </div>
              {progressLogs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No study sessions recorded yet. Click &quot;Record Study Session&quot; to log your first session!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                        <th className="py-3 px-4 font-semibold">Date</th>
                        <th className="py-3 px-4 font-semibold">Subject</th>
                        <th className="py-3 px-4 font-semibold">Videos Done</th>
                        <th className="py-3 px-4 font-semibold">Hours Studied</th>
                        <th className="py-3 px-4 font-semibold">Topics Covered</th>
                        <th className="py-3 px-4 font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {progressLogs.map((log: any) => (
                        <tr key={log._id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">
                            {new Date(log.date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-foreground">
                              {log.subjectId?.name || "General Study"}
                            </span>{" "}
                            <span className="text-[10px] text-muted-foreground">({log.subjectId?.code})</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-primary">+{log.videosCompleted} videos</td>
                          <td className="py-3 px-4 font-bold text-foreground">{log.hoursStudied} hrs</td>
                          <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">{log.topicsCovered}</td>
                          <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">{log.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SUBJECTS & PRIORITIES */}
        {/* ========================================================================= */}
        {activeTab === "subjects" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">{settingsForm.examLabel || "Exam"} Subjects &amp; Prioritization</h2>
                <p className="text-xs text-muted-foreground">
                  All {unitLabels.plural.toLowerCase()} counts, durations, and priority levels are fully editable
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddSubjectModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Subject
                </button>
                <button
                  onClick={handleResetToDefaults}
                  className="rounded-2xl border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Load GATE CS Template
                </button>
              </div>
            </div>

            {/* Editable Subjects Table */}
            <div className="rounded-3xl border bg-card/60 backdrop-blur-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                      <th className="py-3 px-4 font-semibold">Priority Order</th>
                      <th className="py-3 px-4 font-semibold">Subject</th>
                      <th className="py-3 px-4 font-semibold">Priority</th>
                      <th className="py-3 px-4 font-semibold">Remaining Videos</th>
                      <th className="py-3 px-4 font-semibold">Avg Duration</th>
                      <th className="py-3 px-4 font-semibold">Remaining Hours</th>
                      <th className="py-3 px-4 font-semibold">Progress</th>
                      <th className="py-3 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(w.subjects || []).map((s: any, idx: number) => (
                      <tr key={s.id || s.code} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-muted-foreground">#{s.priorityOrder}</td>
                        <td className="py-3 px-4 font-bold text-foreground flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name} <span className="text-[10px] text-muted-foreground font-normal">({s.code})</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              s.priority === "High"
                                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                : s.priority === "Low"
                                ? "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {s.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground">{s.remainingVideos} videos</td>
                        <td className="py-3 px-4 text-muted-foreground">{s.averageVideoDuration} hrs</td>
                        <td className="py-3 px-4 font-bold text-primary">{s.remainingHours} hrs</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${s.completionPercentage}%`, backgroundColor: s.color }}
                              />
                            </div>
                            <span className="font-semibold text-[10px] text-muted-foreground">
                              {s.completionPercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedSubject(s);
                              setShowEditSubjectModal(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-muted/80"
                          >
                            <Edit2 className="h-3 w-3" /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: ANALYTICS & TRENDS */}
        {/* ========================================================================= */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">GATE Preparation Analytics</h2>
              <p className="text-xs text-muted-foreground">Visual study trends, workload distribution, and weekly adherence</p>
            </div>

            {/* Priority Distribution Bar */}
            <div className="rounded-3xl border bg-card/60 p-5 backdrop-blur-sm space-y-3">
              <h3 className="text-sm font-bold text-foreground">Workload Distribution by Priority</h3>
              <div className="h-4 w-full rounded-full bg-muted overflow-hidden flex">
                <div
                  className="bg-blue-600 h-full transition-all"
                  style={{
                    width: `${
                      w.totalRemainingHours > 0 ? (w.highPriorityRemainingHours / w.totalRemainingHours) * 100 : 0
                    }%`,
                  }}
                  title={`High Priority: ${w.highPriorityRemainingHours} hrs`}
                />
                <div
                  className="bg-amber-500 h-full transition-all"
                  style={{
                    width: `${
                      w.totalRemainingHours > 0 ? (w.mediumPriorityRemainingHours / w.totalRemainingHours) * 100 : 0
                    }%`,
                  }}
                  title={`Medium Priority: ${w.mediumPriorityRemainingHours} hrs`}
                />
                <div
                  className="bg-slate-400 h-full transition-all"
                  style={{
                    width: `${
                      w.totalRemainingHours > 0 ? (w.lowPriorityRemainingHours / w.totalRemainingHours) * 100 : 0
                    }%`,
                  }}
                  title={`Low Priority: ${w.lowPriorityRemainingHours} hrs`}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                  <span className="text-[10px] uppercase font-bold">High Priority</span>
                  <p className="text-base font-extrabold text-foreground">{w.highPriorityRemainingHours} hrs</p>
                  <p className="text-[10px] text-muted-foreground">Must complete by {deadlineShort}</p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  <span className="text-[10px] uppercase font-bold">Medium Priority</span>
                  <p className="text-base font-extrabold text-foreground">{w.mediumPriorityRemainingHours} hrs</p>
                  <p className="text-[10px] text-muted-foreground">Secondary concepts</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-500/10 border border-slate-500/20 text-slate-600 dark:text-slate-400">
                  <span className="text-[10px] uppercase font-bold">Low Priority</span>
                  <p className="text-base font-extrabold text-foreground">{w.lowPriorityRemainingHours} hrs</p>
                  <p className="text-[10px] text-muted-foreground">Compiler, C Prog, Verbal</p>
                </div>
              </div>
            </div>

            {/* Daily Study Hours Past 14 Days */}
            <div className="rounded-3xl border bg-card/60 p-5 backdrop-blur-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Daily Study Hours (Past 14 Days)</h3>
                  <p className="text-xs text-muted-foreground">Target: 10 hrs/day (Sundays rest)</p>
                </div>
                <span className="text-xs font-bold text-primary">
                  Adherence: {analyticsData?.weeklySummary?.adherencePercentage || 100}%
                </span>
              </div>

              <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 pt-2">
                {(analyticsData?.past14Days || []).map((day: any) => {
                  const pct = Math.min(100, (day.actualHours / (day.plannedHours || 10)) * 100);
                  return (
                    <div key={day.date} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-muted/40">
                      <span className="text-[10px] font-bold text-muted-foreground">{day.dayName}</span>
                      <div className="h-20 w-3 rounded-full bg-muted overflow-hidden flex flex-col justify-end">
                        <div
                          className={`w-full rounded-full transition-all ${
                            day.isRestDay ? "bg-slate-400" : day.actualHours >= 10 ? "bg-emerald-500" : "bg-primary"
                          }`}
                          style={{ height: `${Math.max(5, pct)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-extrabold text-foreground">{day.actualHours}h</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: JANUARY 2027 – PYQ MODE & MISTAKE NOTEBOOK */}
        {/* ========================================================================= */}
        {activeTab === "pyq" && (
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 p-6 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      Phase 2 Active
                    </span>
                    <span className="text-xs text-muted-foreground">From January 1, 2027</span>
                  </div>
                  <h2 className="text-xl font-black text-foreground">GATE Previous Year Questions (PYQ) Mode</h2>
                  <p className="text-xs text-muted-foreground max-w-xl">
                    Topic-wise accuracy tracking, timed practice sets, difficulty analytics, and personal Mistake Notebook.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowAddPYQModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Record PYQ Session
                  </button>
                  <button
                    onClick={() => setShowAddMistakeModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-2xl border bg-card px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted"
                  >
                    <BookmarkCheck className="h-3.5 w-3.5 text-red-500" />
                    Add Mistake
                  </button>
                </div>
              </div>
            </div>

            {/* PYQ Stats Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-3xl border bg-card/60 p-4 backdrop-blur-sm space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Questions Solved</span>
                <p className="text-2xl font-black text-foreground">{pyqData?.summary?.totalAttempted || 0}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  {pyqData?.summary?.totalCorrect || 0} Correct | {pyqData?.summary?.totalIncorrect || 0} Incorrect
                </p>
              </div>

              <div className="rounded-3xl border bg-card/60 p-4 backdrop-blur-sm space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Overall Accuracy</span>
                <p className="text-2xl font-black text-foreground">{pyqData?.summary?.overallAccuracy || 0}%</p>
                <p className="text-[10px] text-muted-foreground">Target: &gt;80% for top 500 AIR</p>
              </div>

              <div className="rounded-3xl border bg-card/60 p-4 backdrop-blur-sm space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Practice Time</span>
                <p className="text-2xl font-black text-foreground">
                  {Math.round((pyqData?.summary?.totalTimeMinutes || 0) / 60)} hrs
                </p>
                <p className="text-[10px] text-muted-foreground">{pyqData?.summary?.sessionsCount || 0} timed sessions</p>
              </div>

              <div className="rounded-3xl border bg-card/60 p-4 backdrop-blur-sm space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Mistakes in Notebook</span>
                <p className="text-2xl font-black text-foreground">{mistakesData?.pendingCount || 0}</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  {mistakesData?.reviewedCount || 0} concepts reviewed
                </p>
              </div>
            </div>

            {/* Mistake Notebook Section */}
            <div className="rounded-3xl border bg-card/60 p-5 backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <BookmarkCheck className="h-4 w-4 text-red-500" />
                    <span>Personal Mistake Notebook</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Record conceptual errors and review them weekly to avoid repeating mistakes in GATE
                  </p>
                </div>
                <button
                  onClick={() => setShowAddMistakeModal(true)}
                  className="inline-flex items-center gap-1 rounded-xl bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 text-xs font-bold hover:bg-primary/20"
                >
                  <Plus className="h-3.5 w-3.5" /> Add New Error
                </button>
              </div>

              {(!mistakesData?.mistakes || mistakesData.mistakes.length === 0) ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-2xl">
                  No mistakes logged yet. When you solve GATE PYQs and make an error, record it here to build your revision bank!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {mistakesData.mistakes.map((m: any) => (
                    <div
                      key={m._id}
                      className={`p-4 rounded-2xl border space-y-3 transition-all ${
                        m.isReviewed ? "bg-muted/30 border-muted opacity-75" : "bg-card border-red-500/20 shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-primary uppercase">
                            {m.subjectId?.name || "GATE Subject"}
                          </span>
                          <h4 className="font-extrabold text-sm text-foreground">{m.topic}</h4>
                          {m.gateYear && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                              {m.gateYear}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleToggleMistakeReviewed(m._id, m.isReviewed)}
                          className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-all ${
                            m.isReviewed
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25"
                          }`}
                        >
                          {m.isReviewed ? "✓ Reviewed" : "Mark Reviewed"}
                        </button>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/15 text-red-700 dark:text-red-300">
                          <span className="font-bold block text-[10px] uppercase">My Mistake:</span>
                          <p>{m.myMistake}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          <span className="font-bold block text-[10px] uppercase">Correct Concept / Key Insight:</span>
                          <p>{m.correctConcept}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: SETTINGS & CUSTOMIZATION */}
        {/* ========================================================================= */}
        {activeTab === "settings" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Exam Identity &amp; Study Configuration</h2>
              <p className="text-xs text-muted-foreground">Customize your target exam, year, dates, daily study hours, and playback speed</p>
            </div>

            <form onSubmit={handleSaveSettings} className="rounded-3xl border bg-card/60 p-6 backdrop-blur-sm space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Exam Type</label>
                  <select
                    value={settingsForm.examType}
                    onChange={(e) => {
                      const examType = e.target.value;
                      const examLabel = examType === "Custom" ? settingsForm.examLabel : `${examType} ${settingsForm.targetYear}`;
                      setSettingsForm({ ...settingsForm, examType, examLabel });
                    }}
                    className="w-full rounded-2xl border bg-background px-4 py-2.5 text-sm font-semibold"
                  >
                    <option value="GATE CS">GATE CS</option>
                    <option value="GATE DA">GATE DA</option>
                    <option value="GATE ECE">GATE ECE</option>
                    <option value="GATE EE">GATE EE</option>
                    <option value="GATE ME">GATE ME</option>
                    <option value="GATE CE">GATE CE</option>
                    <option value="UPSC">UPSC</option>
                    <option value="CAT">CAT</option>
                    <option value="GRE">GRE</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Target Year</label>
                  <select
                    value={settingsForm.targetYear}
                    onChange={(e) => {
                      const targetYear = Number(e.target.value);
                      const examLabel = settingsForm.examType === "Custom" ? settingsForm.examLabel : `${settingsForm.examType} ${targetYear}`;
                      setSettingsForm({ ...settingsForm, targetYear, examLabel });
                    }}
                    className="w-full rounded-2xl border bg-background px-4 py-2.5 text-sm font-semibold"
                  >
                    {[2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Planner &amp; Sidebar Label</label>
                  <input
                    type="text"
                    value={settingsForm.examLabel}
                    onChange={(e) => setSettingsForm({ ...settingsForm, examLabel: e.target.value })}
                    placeholder="e.g. GATE DA 2028"
                    className="w-full rounded-2xl border bg-background px-4 py-2.5 text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Target Score (out of 100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settingsForm.targetScore}
                    onChange={(e) => setSettingsForm({ ...settingsForm, targetScore: Number(e.target.value) })}
                    className="w-full rounded-2xl border bg-background px-4 py-2.5 text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Target Exam Date</label>
                  <input
                    type="date"
                    value={settingsForm.gateExamDate}
                    onChange={(e) => setSettingsForm({ ...settingsForm, gateExamDate: e.target.value })}
                    className="w-full rounded-2xl border bg-background px-4 py-2.5 text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Syllabus Completion Deadline</label>
                  <input
                    type="date"
                    value={settingsForm.phase1Deadline}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phase1Deadline: e.target.value })}
                    className="w-full rounded-2xl border bg-background px-4 py-2.5 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Effective Study Hours Per Day</label>
                <input
                  type="number"
                  min="1"
                  max="18"
                  value={settingsForm.dailyStudyHours}
                  onChange={(e) => setSettingsForm({ ...settingsForm, dailyStudyHours: Number(e.target.value) })}
                  className="w-full rounded-2xl border bg-background px-4 py-2.5 text-sm font-semibold"
                />
                <p className="text-[11px] text-muted-foreground">Default: 10 hours/day for rigorous preparation</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Study Days Per Week</label>
                <input
                  type="number"
                  min="5"
                  max="7"
                  value={settingsForm.studyDaysPerWeek}
                  onChange={(e) => setSettingsForm({ ...settingsForm, studyDaysPerWeek: Number(e.target.value) })}
                  className="w-full rounded-2xl border bg-background px-4 py-2.5 text-sm font-semibold"
                />
                <p className="text-[11px] text-muted-foreground">Default: 6 days (Sunday is reserved for rest and revision)</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Preparation Style / Study Unit</label>
                <select
                  value={settingsForm.studyStyle}
                  onChange={(e) => setSettingsForm({ ...settingsForm, studyStyle: e.target.value as any })}
                  className="w-full rounded-2xl border bg-background px-4 py-2.5 text-sm font-semibold"
                >
                  <option value="videos">Video Lectures (Tracks Videos &amp; Playback Speed)</option>
                  <option value="topics">Syllabus Topics (Tracks Topics &amp; Study Hours)</option>
                  <option value="chapters">Textbook / Notes Chapters (Tracks Chapters &amp; Hours)</option>
                  <option value="problems">Problem Sets / Practice Drills (Tracks Sets &amp; Hours)</option>
                  <option value="hours">Time-Blocked Study Hours Only</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Choose how you track your syllabus progress — the planner adapts all labels and metrics to match your style.
                </p>
              </div>

              {settingsForm.studyStyle === "videos" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Video Playback Speed Multiplier</label>
                  <select
                    value={settingsForm.playbackSpeed}
                    onChange={(e) => setSettingsForm({ ...settingsForm, playbackSpeed: Number(e.target.value) })}
                    className="w-full rounded-2xl border bg-background px-4 py-2.5 text-sm font-semibold"
                  >
                    <option value={1.0}>1.0x (Standard duration)</option>
                    <option value={1.25}>1.25x (Saves 20% lecture time)</option>
                    <option value={1.5}>1.5x (Saves 33% lecture time)</option>
                    <option value={1.75}>1.75x (Saves 43% lecture time)</option>
                    <option value={2.0}>2.0x (Saves 50% lecture time)</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    Adjusting playback speed recalculates remaining lecture hours across your subjects automatically.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Active Preparation Phase</label>
                <select
                  value={settingsForm.currentPhase}
                  onChange={(e) => setSettingsForm({ ...settingsForm, currentPhase: e.target.value as any })}
                  className="w-full rounded-2xl border bg-background px-4 py-2.5 text-sm font-semibold"
                >
                  <option value="Phase 1 - Lectures & Concept">Phase 1 - Syllabus &amp; Concept Mastery (Until {deadlineShort})</option>
                  <option value="Phase 2 - PYQ Practice">Phase 2 - PYQ &amp; Mock Test Practice</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="rounded-2xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90"
                >
                  Save Study Preferences
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: LOG STUDY PROGRESS */}
        {/* ========================================================================= */}
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-3xl border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                  <Flame className="h-4 w-4 text-primary" />
                  Record Daily Study Session
                </h3>
                <button
                  onClick={() => setShowLogModal(false)}
                  className="p-1 rounded-xl text-muted-foreground hover:bg-muted"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleLogProgress} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Select Subject</label>
                  <select
                    required
                    value={logForm.subjectId}
                    onChange={(e) => {
                      const sid = e.target.value;
                      const sub = w.subjects?.find((s: any) => s.id === sid);
                      setLogForm({
                        ...logForm,
                        subjectId: sid,
                        hoursStudied: sub?.averageVideoDuration || 1.5,
                      });
                    }}
                    className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold text-foreground"
                  >
                    <option value="">-- Choose Subject --</option>
                    {(w.subjects || []).map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.remainingVideos} remaining)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Videos Completed</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={logForm.videosCompleted}
                      onChange={(e) => setLogForm({ ...logForm, videosCompleted: Number(e.target.value) })}
                      className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Hours Studied</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.5"
                      required
                      value={logForm.hoursStudied}
                      onChange={(e) => setLogForm({ ...logForm, hoursStudied: Number(e.target.value) })}
                      className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Topics Covered</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Graph Traversals, B-Trees, TCP Congestion Control"
                    value={logForm.topicsCovered}
                    onChange={(e) => setLogForm({ ...logForm, topicsCovered: e.target.value })}
                    className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Personal Notes / Formula Highlights</label>
                  <textarea
                    rows={2}
                    placeholder="Key edge cases, tricky concepts, or notes to review on Sunday"
                    value={logForm.notes}
                    onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                    className="w-full rounded-2xl border bg-background px-3.5 py-2 font-semibold"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="rounded-2xl border px-4 py-2 font-bold text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-primary px-5 py-2 font-bold text-primary-foreground shadow-md hover:bg-primary/90"
                  >
                    Record & Deduct Lectures
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: EDIT SUBJECT */}
        {/* ========================================================================= */}
        {showEditSubjectModal && selectedSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-extrabold text-base text-foreground">Edit {selectedSubject.name}</h3>
                <button
                  onClick={() => setShowEditSubjectModal(false)}
                  className="p-1 rounded-xl text-muted-foreground hover:bg-muted"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateSubject} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Remaining Videos</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={selectedSubject.remainingVideos}
                    onChange={(e) =>
                      setSelectedSubject({ ...selectedSubject, remainingVideos: Number(e.target.value) })
                    }
                    className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Average Video Duration (Hours)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.2"
                    required
                    value={selectedSubject.averageVideoDuration}
                    onChange={(e) =>
                      setSelectedSubject({ ...selectedSubject, averageVideoDuration: Number(e.target.value) })
                    }
                    className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Priority Tier</label>
                  <select
                    value={selectedSubject.priority}
                    onChange={(e) => setSelectedSubject({ ...selectedSubject, priority: e.target.value })}
                    className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority (Deprioritized)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Priority Order (1 = Highest)</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={selectedSubject.priorityOrder}
                    onChange={(e) =>
                      setSelectedSubject({ ...selectedSubject, priorityOrder: Number(e.target.value) })
                    }
                    className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditSubjectModal(false)}
                    className="rounded-2xl border px-4 py-2 font-bold text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-primary px-5 py-2 font-bold text-primary-foreground shadow-md hover:bg-primary/90"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: RESCHEDULE MISSED HOURS */}
        {/* ========================================================================= */}
        {showRescheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  Reschedule Missed Sessions
                </h3>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="p-1 rounded-xl text-muted-foreground hover:bg-muted"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleReschedule} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Missed Study Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="20"
                    required
                    value={rescheduleForm.missedHours}
                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, missedHours: Number(e.target.value) })}
                    className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    These hours will be reallocated into upcoming buffer slots without exceeding 10h/day.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRescheduleModal(false)}
                    className="rounded-2xl border px-4 py-2 font-bold text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-primary px-5 py-2 font-bold text-primary-foreground shadow-md hover:bg-primary/90"
                  >
                    Rebalance Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: RECORD PYQ SESSION */}
        {/* ========================================================================= */}
        {showAddPYQModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-3xl border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                  <FileQuestion className="h-4 w-4 text-emerald-500" />
                  Record GATE PYQ Practice
                </h3>
                <button
                  onClick={() => setShowAddPYQModal(false)}
                  className="p-1 rounded-xl text-muted-foreground hover:bg-muted"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddPYQ} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Subject</label>
                  <select
                    required
                    value={pyqForm.subjectId}
                    onChange={(e) => setPyqForm({ ...pyqForm, subjectId: e.target.value })}
                    className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                  >
                    <option value="">-- Choose Subject --</option>
                    {(w.subjects || []).map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Topic</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dynamic Programming, Normal Forms"
                      value={pyqForm.topic}
                      onChange={(e) => setPyqForm({ ...pyqForm, topic: e.target.value })}
                      className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">GATE Paper Year</label>
                    <input
                      type="number"
                      value={pyqForm.year}
                      onChange={(e) => setPyqForm({ ...pyqForm, year: Number(e.target.value) })}
                      className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Attempted</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={pyqForm.questionsAttempted}
                      onChange={(e) => setPyqForm({ ...pyqForm, questionsAttempted: Number(e.target.value) })}
                      className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Correct</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={pyqForm.correctAnswers}
                      onChange={(e) => setPyqForm({ ...pyqForm, correctAnswers: Number(e.target.value) })}
                      className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Time (Mins)</label>
                    <input
                      type="number"
                      min="5"
                      value={pyqForm.timeTakenMinutes}
                      onChange={(e) => setPyqForm({ ...pyqForm, timeTakenMinutes: Number(e.target.value) })}
                      className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Difficulty</label>
                    <select
                      value={pyqForm.difficulty}
                      onChange={(e) => setPyqForm({ ...pyqForm, difficulty: e.target.value as any })}
                      className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Status</label>
                    <select
                      value={pyqForm.revisionStatus}
                      onChange={(e) => setPyqForm({ ...pyqForm, revisionStatus: e.target.value as any })}
                      className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                    >
                      <option value="Pending Review">Pending Review</option>
                      <option value="Needs Revision">Needs Revision</option>
                      <option value="Mastered">Mastered</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPYQModal(false)}
                    className="rounded-2xl border px-4 py-2 font-bold text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-emerald-600 px-5 py-2 font-bold text-white shadow-md hover:bg-emerald-700"
                  >
                    Save Practice Set
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: ADD MISTAKE TO NOTEBOOK */}
        {/* ========================================================================= */}
        {showAddMistakeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-3xl border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                  <BookmarkCheck className="h-4 w-4 text-red-500" />
                  Add to Mistake Notebook
                </h3>
                <button
                  onClick={() => setShowAddMistakeModal(false)}
                  className="p-1 rounded-xl text-muted-foreground hover:bg-muted"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddMistake} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Subject</label>
                    <select
                      required
                      value={mistakeForm.subjectId}
                      onChange={(e) => setMistakeForm({ ...mistakeForm, subjectId: e.target.value })}
                      className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                    >
                      <option value="">-- Choose Subject --</option>
                      {(w.subjects || []).map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Topic</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cache Mapping, Virtual Memory"
                      value={mistakeForm.topic}
                      onChange={(e) => setMistakeForm({ ...mistakeForm, topic: e.target.value })}
                      className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">What Was My Mistake / Wrong Assumption?</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Confused direct-mapped line size calculation with block offset"
                    value={mistakeForm.myMistake}
                    onChange={(e) => setMistakeForm({ ...mistakeForm, myMistake: e.target.value })}
                    className="w-full rounded-2xl border bg-background px-3.5 py-2 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Correct Concept / Key Formula / Rule to Remember</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Number of lines = Cache size / Block size. Tag bits = Main memory bits - Line bits - Offset"
                    value={mistakeForm.correctConcept}
                    onChange={(e) => setMistakeForm({ ...mistakeForm, correctConcept: e.target.value })}
                    className="w-full rounded-2xl border bg-background px-3.5 py-2 font-semibold"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMistakeModal(false)}
                    className="rounded-2xl border px-4 py-2 font-bold text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-primary px-5 py-2 font-bold text-primary-foreground shadow-md hover:bg-primary/90"
                  >
                    Add to Mistake Notebook
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD CUSTOM SUBJECT */}
        {showAddSubjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  Add {settingsForm.examLabel || "Exam"} Subject
                </h3>
                <button
                  onClick={() => setShowAddSubjectModal(false)}
                  className="p-1 rounded-xl text-muted-foreground hover:bg-muted"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSubject} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Subject Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Machine Learning"
                      value={newSubjectForm.name}
                      onChange={(e) => setNewSubjectForm({ ...newSubjectForm, name: e.target.value })}
                      className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Short Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ML"
                      value={newSubjectForm.code}
                      onChange={(e) => setNewSubjectForm({ ...newSubjectForm, code: e.target.value.toUpperCase() })}
                      className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Total {unitLabels.plural}</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newSubjectForm.remainingVideos}
                      onChange={(e) => setNewSubjectForm({ ...newSubjectForm, remainingVideos: Number(e.target.value) })}
                      className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Hours per {unitLabels.singular}</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      required
                      value={newSubjectForm.averageVideoDuration}
                      onChange={(e) => setNewSubjectForm({ ...newSubjectForm, averageVideoDuration: Number(e.target.value) })}
                      className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Priority</label>
                  <select
                    value={newSubjectForm.priority}
                    onChange={(e) => setNewSubjectForm({ ...newSubjectForm, priority: e.target.value as any })}
                    className="w-full rounded-2xl border bg-background px-3.5 py-2.5 font-semibold"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSubjectModal(false)}
                    className="rounded-2xl border px-4 py-2 font-bold text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-primary px-5 py-2 font-bold text-primary-foreground shadow-md hover:bg-primary/90"
                  >
                    Add Subject
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
