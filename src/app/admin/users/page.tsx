"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  School,
  BookOpen,
  Calendar,
  Quote,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Filter,
} from "lucide-react";

export default function AdminUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<any[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Reject modal state
  const [rejectModalUser, setRejectModalUser] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 403 || res.status === 401) {
        // Not admin, redirect to dashboard
        router.push("/dashboard");
        return;
      }
      const data = await res.json();
      if (data.success) {
        setCounts(data.counts || { pending: 0, approved: 0, rejected: 0, total: 0 });
        setPendingUsers(data.pendingUsers || []);
        setApprovedUsers(data.approvedUsers || []);
        setRejectedUsers(data.rejectedUsers || []);
      } else {
        showToast(data.message || "Failed to load user requests", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load user data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: string, action: "approve" | "reject", reason?: string) => {
    setActionLoadingId(userId);
    try {
      const res = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, rejectionReason: reason }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message || `User ${action === "approve" ? "approved" : "rejected"} successfully!`);
        if (action === "reject") {
          setRejectModalUser(null);
          setRejectionReason("");
        }
        await fetchUsers();
      } else {
        showToast(data.message || `Failed to ${action} user`, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter users based on search
  const filterList = (list: any[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.college?.toLowerCase().includes(q) ||
        u.branch?.toLowerCase().includes(q) ||
        u.signupReason?.toLowerCase().includes(q)
    );
  };

  const currentList =
    activeTab === "pending"
      ? filterList(pendingUsers)
      : activeTab === "approved"
      ? filterList(approvedUsers)
      : filterList(rejectedUsers);

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md border animate-in slide-in-from-top duration-300 ${
              toastMessage.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
            <span className="text-sm font-semibold">{toastMessage.text}</span>
          </div>
        )}

        {/* Top Header Banner */}
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-indigo-600/15 via-blue-600/10 to-purple-600/15 p-5 sm:p-8 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20 mb-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Administrator Control Center</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Registration Approval & User Management
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
                Review applicant reasons, verify student credentials, and manage account access with automated Resend email notifications.
              </p>
            </div>

            <button
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border bg-card/80 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted shadow-sm transition-all shrink-0 self-start sm:self-auto"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh List</span>
            </button>
          </div>
        </div>

        {/* Stats KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div
            onClick={() => setActiveTab("pending")}
            className={`cursor-pointer rounded-3xl border p-4 sm:p-5 transition-all shadow-sm ${
              activeTab === "pending"
                ? "bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/20"
                : "bg-card/60 hover:border-amber-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pending Requests
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-amber-500 mt-2">
              {counts.pending}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Awaiting your approval or denial
            </p>
          </div>

          <div
            onClick={() => setActiveTab("approved")}
            className={`cursor-pointer rounded-3xl border p-4 sm:p-5 transition-all shadow-sm ${
              activeTab === "approved"
                ? "bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/20"
                : "bg-card/60 hover:border-emerald-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Approved Students
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-500 mt-2">
              {counts.approved}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Active accounts with platform access
            </p>
          </div>

          <div
            onClick={() => setActiveTab("rejected")}
            className={`cursor-pointer rounded-3xl border p-4 sm:p-5 transition-all shadow-sm ${
              activeTab === "rejected"
                ? "bg-rose-500/10 border-rose-500/40 ring-2 ring-rose-500/20"
                : "bg-card/60 hover:border-rose-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Rejected Requests
              </span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                <UserX className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-rose-500 mt-2">
              {counts.rejected}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Denied or revoked applicants
            </p>
          </div>

          <div className="rounded-3xl border bg-card/60 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Applications
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-foreground mt-2">
              {counts.total}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              All registered student accounts
            </p>
          </div>
        </div>

        {/* Tab Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-2">
            {[
              { key: "pending", label: "Pending Approval", count: counts.pending, color: "text-amber-500" },
              { key: "approved", label: "Approved Users", count: counts.approved, color: "text-emerald-500" },
              { key: "rejected", label: "Rejected Requests", count: counts.rejected, color: "text-rose-500" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    activeTab === tab.key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, college..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border bg-card/80 py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Requests & User List */}
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground space-y-3">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p>Loading registration requests...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="rounded-3xl border bg-card/40 p-12 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <UserCheck className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              No {activeTab} users found
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? "No users match your search query. Try clearing the filter."
                : activeTab === "pending"
                ? "Awesome! There are no pending registration requests awaiting approval."
                : `No users in the ${activeTab} category.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {currentList.map((applicant) => {
              const isActionLoading = actionLoadingId === applicant._id;

              return (
                <div
                  key={applicant._id}
                  className="rounded-3xl border bg-card/80 p-5 sm:p-6 shadow-sm hover:border-primary/40 transition-all space-y-4"
                >
                  {/* Top user row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-lg shrink-0 shadow-md shadow-blue-500/20">
                        {applicant.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-extrabold text-foreground">
                            {applicant.name}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              applicant.status === "approved"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : applicant.status === "rejected"
                                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            }`}
                          >
                            {applicant.status}
                          </span>
                          {applicant.role === "admin" && (
                            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-500 border border-blue-500/20">
                              Admin
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-primary" />
                            <a href={`mailto:${applicant.email}`} className="hover:underline text-foreground/80">
                              {applicant.email}
                            </a>
                          </span>
                          {applicant.college && (
                            <span className="flex items-center gap-1">
                              <School className="h-3 w-3 text-muted-foreground" />
                              {applicant.college}
                            </span>
                          )}
                          {applicant.branch && (
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3 text-muted-foreground" />
                              {applicant.branch} &middot; Sem {applicant.semester || 1}
                            </span>
                          )}
                          {applicant.rollNumber && (
                            <span>Roll: {applicant.rollNumber}</span>
                          )}
                          <span className="flex items-center gap-1 text-[11px]">
                            <Calendar className="h-3 w-3" />
                            Applied: {new Date(applicant.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {applicant.status === "pending" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleAction(applicant._id, "approve")}
                          disabled={isActionLoading}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-500/30 hover:bg-emerald-700 transition-all disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Approve & Email</span>
                        </button>
                        <button
                          onClick={() => setRejectModalUser(applicant)}
                          disabled={isActionLoading}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>Deny</span>
                        </button>
                      </div>
                    )}

                    {applicant.status === "approved" && applicant.email !== "chenthilhari@gmail.com" && (
                      <button
                        onClick={() => setRejectModalUser(applicant)}
                        disabled={isActionLoading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
                      >
                        <UserX className="h-3.5 w-3.5" />
                        <span>Revoke Access</span>
                      </button>
                    )}

                    {applicant.status === "rejected" && (
                      <button
                        onClick={() => handleAction(applicant._id, "approve")}
                        disabled={isActionLoading}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/90 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Re-Approve Access</span>
                      </button>
                    )}
                  </div>

                  {/* Stated Reason for wanting an account */}
                  <div className="rounded-2xl border bg-background/80 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 dark:text-indigo-400">
                      <Quote className="h-3.5 w-3.5" />
                      <span>Why they want to create an account:</span>
                    </div>
                    <p className="text-xs sm:text-sm text-foreground/90 italic leading-relaxed pl-5 border-l-2 border-indigo-500/40">
                      &ldquo;{applicant.signupReason || "No specific reason provided."}&rdquo;
                    </p>
                  </div>

                  {/* Rejection Note if rejected */}
                  {applicant.status === "rejected" && applicant.rejectionReason && (
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-600 dark:text-rose-400">
                      <strong>Rejection Note:</strong> {applicant.rejectionReason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Rejection / Denial Confirmation Modal */}
        {rejectModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-500">
                <div className="p-2 rounded-2xl bg-rose-500/10">
                  <UserX className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-foreground">
                    Deny Registration Request
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {rejectModalUser.name} &middot; {rejectModalUser.email}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                An automated email will be sent from <strong>noreply@hari07.tech</strong> informing the applicant that their registration was not approved.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Reason for Denial (Optional)
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Account limit reached / Non-supported institution..."
                  className="w-full rounded-2xl border bg-background/80 p-3 text-xs text-foreground focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalUser(null);
                    setRejectionReason("");
                  }}
                  className="rounded-xl border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAction(rejectModalUser._id, "reject", rejectionReason)
                  }
                  disabled={actionLoadingId === rejectModalUser._id}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
                >
                  {actionLoadingId === rejectModalUser._id ? "Processing..." : "Confirm Denial & Send Email"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
