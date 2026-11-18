"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useRouter } from "next/navigation";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check session
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          router.push("/auth/login");
        } else {
          setIsCheckingAuth(false);
        }
      })
      .catch(() => {
        router.push("/auth/login");
      });

    // Register service worker if available
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("Service Worker registered."))
        .catch((err) => console.log("Service Worker failed:", err));
    }
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse font-medium">
            Loading Academic AI...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
