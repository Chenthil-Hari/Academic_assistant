"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Download,
  FileSpreadsheet,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  FileText,
  Printer,
} from "lucide-react";

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/attendance/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStats(data);
      })
      .catch((err) => console.error("Error loading stats:", err))
      .finally(() => setLoading(false));
  }, []);

  const overall = stats?.overall;
  const subjects = stats?.subjects || [];
  const targetPct = stats?.targetPercentage || 75;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Academic Reports & Analytics
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Comprehensive subject-wise attendance analytics and audit-compliant downloadable reports.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-sm transition-all"
            >
              <Printer className="h-4 w-4 text-muted-foreground" />
              <span>Print Report</span>
            </button>
            <a
              href="/api/reports/export-csv?type=summary"
              download
              className="inline-flex items-center justify-center gap-2 rounded-xl border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-sm transition-all text-center"
            >
              <Download className="h-4 w-4 text-primary" />
              <span>Export Summary CSV</span>
            </a>

            <a
              href="/api/reports/export-csv?type=logs"
              download
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all text-center"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Detailed Logs CSV</span>
            </a>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-3xl border bg-muted/40 p-6 h-28" />
            ))}
          </div>
        )}

        {/* Analytics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="rounded-3xl border bg-card p-4 sm:p-6 shadow-sm space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Overall Status
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-foreground">
                {overall ? `${overall.overallPercentage}%` : "--"}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  (overall?.overallPercentage || 0) >= targetPct
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {overall?.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Calculated over {overall?.totalConducted || 0} conducted classes ({overall?.totalAttended || 0} attended).
            </p>
          </div>

          <div className="rounded-3xl border bg-card p-4 sm:p-6 shadow-sm space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Subject Compliance
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-emerald-500">
                {subjects.filter((s: any) => s.status === "Safe").length} / {subjects.length}
              </span>
              <span className="text-xs text-muted-foreground">Safe Subjects</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {subjects.filter((s: any) => s.status === "Critical").length} subject(s) currently below critical threshold.
            </p>
          </div>

          <div className="rounded-3xl border bg-card p-4 sm:p-6 shadow-sm space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Excused / Cancelled
            </span>
            <div className="text-3xl sm:text-4xl font-black text-zinc-400">
              {overall?.totalCancelled || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Cancelled classes are correctly excluded from conducted classes formula.
            </p>
          </div>
        </div>

        {/* Visual Comparison Chart / Bars */}
        <div className="rounded-3xl border bg-card p-4 sm:p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="text-base font-bold text-foreground">
              Subject Attendance vs. Target Threshold ({targetPct}%)
            </h2>
            <span className="text-xs text-muted-foreground">Formula: (Attended / Conducted) × 100</span>
          </div>

          {subjects.length === 0 ? (
            <p className="text-center py-8 text-xs text-muted-foreground">
              No subjects registered yet.
            </p>
          ) : (
            <div className="space-y-4">
              {subjects.map((sub: any) => (
                <div key={sub.subjectId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-extrabold text-foreground shrink-0">{sub.subjectCode}</span>
                      <span className="text-muted-foreground truncate">{sub.subjectName}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 font-semibold shrink-0">
                      <span className="hidden xs:inline">{sub.attended}/{sub.conducted}</span>
                      <span
                        className={
                          sub.status === "Safe"
                            ? "text-emerald-500"
                            : sub.status === "Warning"
                            ? "text-amber-500"
                            : "text-red-500"
                        }
                      >
                        {sub.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Visual Bar */}
                  <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        sub.status === "Safe"
                          ? "bg-emerald-500"
                          : sub.status === "Warning"
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(100, sub.percentage)}%` }}
                    />
                    {/* Target line indicator */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-foreground/75"
                      style={{ left: `${targetPct}%` }}
                      title={`Target ${targetPct}%`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Complete Table with Bunk / Attendance Requirements */}
        <div className="rounded-3xl border bg-card p-4 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-foreground">
            Subject-wise Academic Standing Report
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="border-b bg-muted/30 text-muted-foreground uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Subject Name</th>
                  <th className="px-4 py-3">Attended</th>
                  <th className="px-4 py-3">Conducted</th>
                  <th className="px-4 py-3">Cancelled</th>
                  <th className="px-4 py-3">Current %</th>
                  <th className="px-4 py-3">Target %</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Bunk / Need Analysis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subjects.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-6 text-muted-foreground">
                      No subject data available.
                    </td>
                  </tr>
                ) : (
                  subjects.map((sub: any) => (
                    <tr key={sub.subjectId} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-extrabold text-foreground">{sub.subjectCode}</td>
                      <td className="px-4 py-3 text-muted-foreground">{sub.subjectName}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-500">{sub.attended}</td>
                      <td className="px-4 py-3">{sub.conducted}</td>
                      <td className="px-4 py-3 text-muted-foreground">{sub.cancelled}</td>
                      <td className="px-4 py-3 font-bold text-foreground">{sub.percentage}%</td>
                      <td className="px-4 py-3 text-muted-foreground">{sub.targetPercentage}%</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            sub.status === "Safe"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : sub.status === "Warning"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {sub.maxClassesCanMiss > 0 ? (
                          <span className="text-emerald-500">
                            Can miss {sub.maxClassesCanMiss} class(es)
                          </span>
                        ) : sub.classesNeededForTarget > 0 ? (
                          <span className="text-red-500">
                            Must attend {sub.classesNeededForTarget} class(es)
                          </span>
                        ) : (
                          <span className="text-muted-foreground">On target</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
