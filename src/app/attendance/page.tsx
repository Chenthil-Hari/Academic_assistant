"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Filter,
  History,
  Calculator,
  Edit2,
  Trash2,
  Download,
  AlertCircle,
  FileSpreadsheet,
  Check,
  X,
  ShieldAlert,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AttendancePage() {
  const [stats, setStats] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Modals
  const [showBunkModal, setShowBunkModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);

  // Bunk Simulator state
  const [simFutureConducted, setSimFutureConducted] = useState(0);
  const [simFutureAttended, setSimFutureAttended] = useState(0);

  // Form states
  const [newSubject, setNewSubject] = useState({ code: "", name: "", credit: 3, minAttendanceThreshold: 75 });
  const [newRecord, setNewRecord] = useState({ subjectId: "", date: new Date().toISOString().split("T")[0], status: "Attended", notes: "" });
  const [editForm, setEditForm] = useState({ status: "Attended", notes: "", reason: "" });

  useEffect(() => {
    loadData();
  }, [selectedSubject, selectedStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, subRes] = await Promise.all([
        fetch("/api/attendance/stats"),
        fetch("/api/subjects"),
      ]);
      const [statsJson, subJson] = await Promise.all([statsRes.json(), subRes.json()]);

      if (statsJson.success) setStats(statsJson);
      if (subJson.success) setSubjects(subJson.subjects || []);

      // Fetch records with filters
      let recordsUrl = "/api/attendance?limit=100";
      if (selectedSubject) recordsUrl += `&subjectId=${selectedSubject}`;
      if (selectedStatus) recordsUrl += `&status=${selectedStatus}`;

      const recRes = await fetch(recordsUrl);
      const recJson = await recRes.json();
      if (recJson.success) setRecords(recJson.records || []);
    } catch (err) {
      console.error("Attendance page load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAuditLogs = async () => {
    try {
      const res = await fetch("/api/attendance/audit-logs");
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs || []);
        setShowAuditModal(true);
      }
    } catch (err) {}
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSubject),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddSubjectModal(false);
        setNewSubject({ code: "", name: "", credit: 3, minAttendanceThreshold: 75 });
        loadData();
      } else {
        alert(data.message || "Failed to create subject.");
      }
    } catch (err) {
      alert("Error creating subject.");
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddRecordModal(false);
        setNewRecord({ subjectId: "", date: new Date().toISOString().split("T")[0], status: "Attended", notes: "" });
        loadData();
      } else {
        alert(data.message || "Failed to save attendance.");
      }
    } catch (err) {
      alert("Error saving record.");
    }
  };

  const handleDeleteSubject = async (subjectId: string, subjectCode: string) => {
    if (!confirm(`Delete subject "${subjectCode}" and all its attendance records? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/subjects/${subjectId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        loadData();
      } else {
        alert(data.message || "Failed to delete subject.");
      }
    } catch (err) {
      alert("Error deleting subject.");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord) return;
    try {
      const res = await fetch(`/api/attendance/${editRecord._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        setEditRecord(null);
        loadData();
      } else {
        alert(data.message || "Failed to edit record.");
      }
    } catch (err) {
      alert("Error editing attendance.");
    }
  };

  const overall = stats?.overall;
  const targetPct = stats?.targetPercentage || 75;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Attendance Management
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Formula: (Attended / Conducted) × 100 • Cancelled & pending classes do not count as conducted.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowBunkModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-sm transition-all"
            >
              <Calculator className="h-4 w-4 text-primary" />
              <span>Bunk Calculator</span>
            </button>

            <button
              onClick={handleOpenAuditLogs}
              className="inline-flex items-center gap-2 rounded-xl border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-sm transition-all"
            >
              <History className="h-4 w-4 text-indigo-500" />
              <span>Audit Logs</span>
            </button>

            <button
              onClick={() => setShowAddRecordModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Mark Record</span>
            </button>
          </div>
        </div>

        {/* Overall Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="rounded-3xl border bg-card p-3.5 sm:p-5 shadow-sm space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Overall Attendance
            </span>
            <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
              <span className="text-2xl sm:text-3xl font-black text-foreground">
                {overall ? `${overall.overallPercentage}%` : "--%"}
              </span>
              <span
                className={`rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold ${
                  (overall?.overallPercentage || 0) >= targetPct
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {overall?.status || "Safe"}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground">
              Target minimum: {targetPct}%
            </p>
          </div>

          <div className="rounded-3xl border bg-card p-3.5 sm:p-5 shadow-sm space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Attended Classes
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-500">
              {overall?.totalAttended || 0}
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground">
              Total classes present
            </p>
          </div>

          <div className="rounded-3xl border bg-card p-3.5 sm:p-5 shadow-sm space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Absent Classes
            </span>
            <div className="text-2xl sm:text-3xl font-black text-red-500">
              {overall?.totalAbsent || 0}
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground">
              Missed classes
            </p>
          </div>

          <div className="rounded-3xl border bg-card p-3.5 sm:p-5 shadow-sm space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Conducted Classes
            </span>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {overall?.totalConducted || 0}
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground">
              Attended + Absent
            </p>
          </div>

          <div className="rounded-3xl border bg-card p-3.5 sm:p-5 shadow-sm space-y-2 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Cancelled / Excluded
            </span>
            <div className="text-2xl sm:text-3xl font-black text-zinc-400">
              {overall?.totalCancelled || 0}
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground">
              Excluded from conducted
            </p>
          </div>
        </div>

        {/* Subject-wise Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Registered Subjects</h2>
            <button
              onClick={() => setShowAddSubjectModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Subject</span>
            </button>
          </div>

          {!stats?.subjects || stats.subjects.length === 0 ? (
            <div className="rounded-3xl border bg-card p-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No subjects added yet.</p>
              <button
                onClick={() => setShowAddSubjectModal(true)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Add Your First Subject
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.subjects.map((sub: any) => (
                <div
                  key={sub.subjectId}
                  className="rounded-3xl border bg-card p-4 sm:p-5 shadow-sm space-y-4 hover:border-primary/40 transition-all"
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
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${
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

                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-foreground">
                      {sub.percentage}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {sub.attended} / {sub.conducted} Conducted
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

                  <div className="pt-2 border-t flex items-center justify-between text-xs">
                    {sub.maxClassesCanMiss > 0 ? (
                      <span className="text-emerald-500 font-semibold">
                        Bunk buffer: {sub.maxClassesCanMiss} class(es)
                      </span>
                    ) : sub.classesNeededForTarget > 0 ? (
                      <span className="text-red-500 font-semibold">
                        Need {sub.classesNeededForTarget} more class(es)
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        On target ({sub.targetPercentage}%)
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        Cancelled: {sub.cancelled}
                      </span>
                      <button
                        onClick={() => handleDeleteSubject(sub.subjectId, sub.subjectCode)}
                        className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete subject"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detailed Attendance Records Table with filters */}
        <div className="rounded-3xl border bg-card p-4 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Attendance Records & History</h2>
              <p className="text-xs text-muted-foreground">
                Click "Edit" on any historical record to update it with audit logging.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="rounded-xl border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none max-w-full"
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-xl border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none max-w-full"
              >
                <option value="">All Statuses</option>
                <option value="Attended">Attended</option>
                <option value="Absent">Absent</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Pending">Pending</option>
              </select>

              <a
                href="/api/reports/export-csv?type=logs"
                download
                className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV</span>
              </a>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="border-b bg-muted/40 text-muted-foreground uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No attendance records match your filter.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                        {formatDate(r.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground">
                          {r.subjectId?.code || "Unknown"}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                          {r.subjectId?.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            r.status === "Attended"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : r.status === "Absent"
                              ? "bg-red-500/10 text-red-500"
                              : r.status === "Cancelled"
                              ? "bg-zinc-500/10 text-zinc-400"
                              : "bg-amber-500/10 text-amber-500"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {r.source === "daily_checkin"
                          ? "4 PM Check-in"
                          : r.source === "ai_assistant"
                          ? "AI Assistant"
                          : "Manual"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                        {r.notes || "—"}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setEditRecord(r);
                            setEditForm({
                              status: r.status,
                              notes: r.notes || "",
                              reason: "",
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bunk Calculator Modal */}
        {showBunkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border bg-card p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-base text-foreground">Bunk & Target Calculator</h3>
                </div>
                <button
                  onClick={() => setShowBunkModal(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <p className="text-muted-foreground">
                  Calculate exactly how many classes you can afford to miss or need to attend to satisfy attendance criteria.
                </p>

                <div className="rounded-2xl bg-muted/40 p-4 space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span>Overall Attendance:</span>
                    <span className="text-foreground">{overall?.overallPercentage || 0}%</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Target Threshold:</span>
                    <span className="text-primary">{targetPct}%</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Conducted Classes:</span>
                    <span>{overall?.totalConducted || 0}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Attended Classes:</span>
                    <span>{overall?.totalAttended || 0}</span>
                  </div>
                </div>

                <div className="rounded-2xl border p-4">
                  {overall?.maxClassesCanMiss > 0 ? (
                    <div className="text-emerald-500 space-y-1">
                      <span className="font-bold text-sm">🎉 You are in the Safe Zone!</span>
                      <p className="text-muted-foreground">
                        You can safely miss <strong>{overall.maxClassesCanMiss}</strong> class(es) without falling below your {targetPct}% requirement.
                      </p>
                    </div>
                  ) : overall?.classesNeededForTarget > 0 ? (
                    <div className="text-red-500 space-y-1">
                      <span className="font-bold text-sm">⚠️ Below Attendance Target!</span>
                      <p className="text-muted-foreground">
                        You need to attend the next <strong>{overall.classesNeededForTarget}</strong> consecutive class(es) to elevate your attendance to {targetPct}%.
                      </p>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      Your attendance is exactly on target. Any missed class will trigger a deficit.
                    </div>
                  )}
                </div>

                {/* Interactive What-If Simulator */}
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="font-bold text-foreground text-sm">🧮 What-If Simulator</div>
                  <p className="text-muted-foreground text-[11px]">Simulate future classes to predict your attendance %.</p>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Future classes conducted</label>
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={simFutureConducted}
                        onChange={(e) => setSimFutureConducted(Math.max(0, Number(e.target.value)))}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Of which you attend</label>
                      <input
                        type="number"
                        min={0}
                        max={simFutureConducted}
                        value={simFutureAttended}
                        onChange={(e) => setSimFutureAttended(Math.min(simFutureConducted, Math.max(0, Number(e.target.value))))}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                      />
                    </div>
                  </div>
                  {simFutureConducted > 0 && (() => {
                    const newAttended = (overall?.totalAttended || 0) + simFutureAttended;
                    const newConducted = (overall?.totalConducted || 0) + simFutureConducted;
                    const newPct = newConducted === 0 ? 100 : Number(((newAttended / newConducted) * 100).toFixed(1));
                    const isAbove = newPct >= targetPct;
                    return (
                      <div className={`rounded-xl p-3 ${isAbove ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                        <div className="font-bold">Projected attendance: {newPct}%</div>
                        <div className="text-[11px] mt-0.5 text-muted-foreground">
                          {isAbove ? `✅ You'll be ${(newPct - targetPct).toFixed(1)}% above target.` : `❌ You'll be ${(targetPct - newPct).toFixed(1)}% below target.`}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <button
                onClick={() => setShowBunkModal(false)}
                className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground"
              >
                Close Calculator
              </button>
            </div>
          </div>
        )}

        {/* Edit Record Modal with Audit Log Reason */}
        {editRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border bg-card p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-base text-foreground">Edit Historical Attendance</h3>
                <button
                  onClick={() => setEditRecord(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-foreground">Subject</label>
                  <div className="mt-1 font-bold text-sm text-foreground">
                    {editRecord.subjectId?.code} - {editRecord.subjectId?.name}
                  </div>
                  <div className="text-muted-foreground">
                    Date: {formatDate(editRecord.date)}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Status *</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                  >
                    <option value="Attended">Attended</option>
                    <option value="Absent">Absent</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Reason for change * (Audit Log)</label>
                  <input
                    type="text"
                    required
                    value={editForm.reason}
                    onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                    placeholder="e.g. Teacher marked proxy by mistake, was present"
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Notes (optional)</label>
                  <input
                    type="text"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Add personal notes..."
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditRecord(null)}
                    className="rounded-xl border px-4 py-2 text-foreground hover:bg-muted font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-primary px-4 py-2 text-primary-foreground font-semibold"
                  >
                    Save & Log Change
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Audit Logs Drawer/Modal */}
        {showAuditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl border bg-card p-4 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-indigo-500" />
                  <h3 className="font-bold text-base text-foreground">Attendance Audit History</h3>
                </div>
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 text-xs">
                {auditLogs.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No historical modifications recorded in audit log.
                  </p>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log._id} className="rounded-2xl border bg-muted/30 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{log.action}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {log.reason && (
                        <p className="text-muted-foreground">
                          <strong>Reason:</strong> {log.reason}
                        </p>
                      )}
                      {log.previousData && log.newData && (
                        <div className="text-[11px] text-muted-foreground bg-card/60 p-2 rounded-xl">
                          <div>
                            <span className="text-red-400">Previous:</span> {JSON.stringify(log.previousData)}
                          </div>
                          <div>
                            <span className="text-emerald-400">Updated to:</span> {JSON.stringify(log.newData)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setShowAuditModal(false)}
                className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground"
              >
                Close Audit Logs
              </button>
            </div>
          </div>
        )}

        {/* Add Subject Modal */}
        {showAddSubjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border bg-card p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-base text-foreground">Add New Subject</h3>
                <button
                  onClick={() => setShowAddSubjectModal(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubject} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Subject Code * (e.g. CS201)</label>
                  <input
                    type="text"
                    required
                    value={newSubject.code}
                    onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value.toUpperCase() })}
                    placeholder="DBMS"
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Subject Name *</label>
                  <input
                    type="text"
                    required
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                    placeholder="Database Management Systems"
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Credits</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={newSubject.credit}
                      onChange={(e) => setNewSubject({ ...newSubject, credit: Number(e.target.value) })}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Min Threshold %</label>
                    <input
                      type="number"
                      min={50}
                      max={100}
                      value={newSubject.minAttendanceThreshold}
                      onChange={(e) => setNewSubject({ ...newSubject, minAttendanceThreshold: Number(e.target.value) })}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSubjectModal(false)}
                    className="rounded-xl border px-4 py-2 text-foreground hover:bg-muted font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-primary px-4 py-2 text-primary-foreground font-semibold"
                  >
                    Create Subject
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Record Modal */}
        {showAddRecordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border bg-card p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-base text-foreground">Record Attendance</h3>
                <button
                  onClick={() => setShowAddRecordModal(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRecord} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Select Subject *</label>
                  <select
                    required
                    value={newRecord.subjectId}
                    onChange={(e) => setNewRecord({ ...newRecord, subjectId: e.target.value })}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                  >
                    <option value="">-- Choose Subject --</option>
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Date *</label>
                    <input
                      type="date"
                      required
                      value={newRecord.date}
                      onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Status *</label>
                    <select
                      value={newRecord.status}
                      onChange={(e) => setNewRecord({ ...newRecord, status: e.target.value })}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                    >
                      <option value="Attended">Attended</option>
                      <option value="Absent">Absent</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Notes (optional)</label>
                  <input
                    type="text"
                    value={newRecord.notes}
                    onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                    placeholder="e.g. Extra class held on Saturday"
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddRecordModal(false)}
                    className="rounded-xl border px-4 py-2 text-foreground hover:bg-muted font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-primary px-4 py-2 text-primary-foreground font-semibold"
                  >
                    Record Attendance
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
