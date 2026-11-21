"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckCircle2,
  CalendarDays,
  Sparkles,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  onOpenMenu: () => void;
}

export function MobileNav({ onOpenMenu }: MobileNavProps) {
  const pathname = usePathname();

  const NAV_ITEMS = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Attendance", href: "/attendance", icon: CheckCircle2 },
    { label: "Timetable", href: "/timetable", icon: CalendarDays },
    { label: "AI Assistant", href: "/ai-assistant", icon: Sparkles, isAi: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/90 backdrop-blur-xl px-1 sm:px-2 py-1 md:hidden shadow-lg safe-bottom">
      <div className="flex items-center justify-around w-full max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 min-w-0 flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 min-h-[44px]",
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-xl transition-all",
                  isActive && "bg-primary/10",
                  item.isAi && !isActive && "text-primary"
                )}
              >
                <Icon className={cn("h-5 w-5", item.isAi && "animate-pulse")} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}

        {/* Menu Drawer Toggle */}
        <button
          onClick={onOpenMenu}
          className="flex flex-1 min-w-0 flex-col items-center justify-center py-1 px-1 rounded-2xl text-muted-foreground hover:text-foreground min-h-[44px]"
          aria-label="Open Menu"
        >
          <div className="p-1 rounded-xl">
            <Menu className="h-5 w-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">More</span>
        </button>
      </div>
    </nav>
  );
}
