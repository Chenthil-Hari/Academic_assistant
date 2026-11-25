"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckCircle2,
  CalendarDays,
  Calendar,
  Sparkles,
  BarChart3,
  UploadCloud,
  Settings,
  GraduationCap,
  Target,
  X,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "GATE 2027 Planner", href: "/gate-planner", icon: Target, badge: "GATE" },
  { name: "Attendance", href: "/attendance", icon: CheckCircle2 },
  { name: "Timetable", href: "/timetable", icon: CalendarDays },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "AI Assistant", href: "/ai-assistant", icon: Sparkles, badge: "AI" },
  { name: "PDF Upload", href: "/upload", icon: UploadCloud },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [examLabel, setExamLabel] = useState("Exam");
  const [examBadge, setExamBadge] = useState("PLANNER");

  useEffect(() => {
    checkAdmin();
    loadExamLabel();
  }, []);

  const loadExamLabel = async () => {
    try {
      const res = await fetch("/api/gate/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        const label = data.settings.examLabel || "GATE 2027";
        const type = data.settings.examType || "GATE";
        setExamLabel(label);
        setExamBadge(type.split(" ")[0].toUpperCase().slice(0, 6) || "EXAM");
      }
    } catch (err) {
      // ignore
    }
  };

  const checkAdmin = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success && data.user) {
        // Admin panel is strictly reserved for Hari's login
        const adminStatus =
          data.user.email?.toLowerCase() === "chenthilhari@gmail.com";
        setIsAdmin(adminStatus);
        if (adminStatus) {
          // Fetch pending requests count
          const adminRes = await fetch("/api/admin/users");
          const adminData = await adminRes.json();
          if (adminData.success && adminData.counts) {
            setPendingCount(adminData.counts.pending || 0);
          }
        }
      }
    } catch (err) {
      // ignore
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r bg-card/95 backdrop-blur-md transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand / Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b">
          <Link href="/dashboard" className="flex items-center gap-3 font-bold text-lg text-primary">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-foreground">
                Academic <span className="text-primary">AI</span>
              </span>
              <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-widest">
                Student OS
              </span>
            </div>
          </Link>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Academic Menu
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            const displayName = item.href === "/gate-planner" ? `${examLabel} Planner` : item.name;
            const displayBadge = item.href === "/gate-planner" ? examBadge : item.badge;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-transform group-hover:scale-110",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span>{displayName}</span>
                </div>
                {displayBadge && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-primary/10 text-primary group-hover:bg-primary/20"
                    )}
                  >
                    {displayBadge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Admin Control Link (Only visible to admin) */}
          {isAdmin && (
            <div className="pt-3">
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center justify-between">
                <span>Admin Control</span>
                <ShieldCheck className="h-3 w-3 text-amber-500" />
              </div>
              <Link
                href="/admin/users"
                onClick={onClose}
                className={cn(
                  "group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                  pathname.startsWith("/admin")
                    ? "bg-amber-500 text-white shadow-sm shadow-amber-500/25 font-semibold"
                    : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck
                    className={cn(
                      "h-4 w-4 transition-transform group-hover:scale-110",
                      pathname.startsWith("/admin")
                        ? "text-white"
                        : "text-amber-500"
                    )}
                  />
                  <span>User Requests</span>
                </div>
                {pendingCount > 0 && (
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-300 px-2 py-0.5 text-[10px] font-black">
                    {pendingCount}
                  </span>
                )}
              </Link>
            </div>
          )}
        </div>

        {/* 4 PM Check-in Banner in Sidebar */}
        <div className="p-4 border-t">
          <div className="rounded-xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 p-3.5 border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Daily Check-in</span>
              <span className="rounded-md bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                4:00 PM IST
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Automatic daily attendance check-in & review.
            </p>
            <Link
              href="/attendance"
              className="mt-2.5 block text-center rounded-lg bg-primary/15 hover:bg-primary/25 py-1.5 text-xs font-semibold text-primary transition-colors"
            >
              Review Attendance
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
