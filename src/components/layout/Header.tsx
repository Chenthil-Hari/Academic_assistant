"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  Sun,
  Moon,
  Bell,
  LogOut,
  Sparkles,
  CheckCircle,
  CalendarCheck,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import Link from "next/link";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { ThemeSwitch } from "./ThemeSwitch";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const { theme, setTheme, actualTheme } = useTheme();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [user, setUser] = useState<any>(null);
  const notifRef = useRef<HTMLDivElement>(null); // BUG FIX: for outside-click close

  useEffect(() => {
    // Fetch current user
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});

    // Fetch unread notifications
    fetchNotifications();
  }, []);

  // BUG FIX: Close notification panel on outside click
  useEffect(() => {
    if (!showNotifications) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showNotifications]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {}
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth/login");
      router.refresh();
    } catch (err) {
      router.push("/auth/login");
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-card/80 px-3 sm:px-6 md:px-8 backdrop-blur-md">
      {/* Left side: Hamburger & quick search/date */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
          aria-label="Toggle Navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarCheck className="h-4 w-4 text-primary" />
          <span className="font-medium">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Right side: AI quick shortcut, Checkin button, notifications, theme toggle, user */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
        {/* PWA Install Button */}
        <PWAInstallPrompt variant="button" />

        {/* Quick AI button */}
        <Link
          href="/ai-assistant"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/20 px-3 py-1.5 text-xs font-semibold text-primary transition-all border border-primary/20 shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />
          <span>Ask AI</span>
        </Link>

        {/* Quick Check-in trigger */}
        <Link
          href="/attendance"
          className="hidden xs:inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-all shrink-0"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Check-in</span>
        </Link>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-background">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="fixed inset-x-3 top-16 sm:inset-auto sm:right-0 sm:top-full sm:absolute sm:mt-2 w-auto sm:w-80 max-w-sm rounded-2xl border bg-card p-4 shadow-xl z-50">
              <div className="flex items-center justify-between pb-3 border-b">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="mt-3 max-h-72 overflow-y-auto space-y-2.5">
                {notifications.length === 0 ? (
                  <p className="text-center py-6 text-xs text-muted-foreground">
                    No notifications yet.
                  </p>
                ) : (
                  notifications.slice(0, 6).map((n) => (
                    <div
                      key={n._id}
                      className={`p-2.5 rounded-xl text-xs transition-colors ${
                        n.read ? "bg-muted/40" : "bg-primary/10 border border-primary/20"
                      }`}
                    >
                      <div className="font-semibold text-foreground">{n.title}</div>
                      <div className="text-muted-foreground mt-0.5">{n.message}</div>
                      <div className="mt-1.5 text-[10px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Day / Night Animated Theme Switch */}
        <ThemeSwitch />

        {/* User initials & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : "AI"}
          </div>

          <button
            onClick={handleLogout}
            title="Log out"
            className="rounded-xl p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
