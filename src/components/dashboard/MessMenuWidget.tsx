"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Utensils,
  Coffee,
  Sun,
  Moon,
  Clock,
  Edit2,
  Check,
  X,
  ChevronRight,
  Sparkles,
  AlertCircle,
} from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function MessMenuWidget() {
  const [menus, setMenus] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    breakfast: "",
    lunch: "",
    snacks: "",
    dinner: "",
    specialNotes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mess-menu");
      const json = await res.json();
      if (json.success) {
        setMenus(json.menus || []);
        if (json.currentDayOfWeek !== undefined) {
          setSelectedDay(json.currentDayOfWeek);
          setCurrentDay(json.currentDayOfWeek);
        }
      }
    } catch (err) {
      console.error("Failed to load mess menus:", err);
    } finally {
      setLoading(false);
    }
  };

  const activeMenu = menus.find((m) => m.dayOfWeek === selectedDay) || {
    breakfast: [],
    lunch: [],
    snacks: [],
    dinner: [],
    timings: {
      breakfast: "07:30 - 09:30 AM",
      lunch: "12:30 - 02:30 PM",
      snacks: "04:30 - 05:45 PM",
      dinner: "07:30 - 09:30 PM",
    },
    specialNotes: "",
  };

  // Determine which meal is current based on IST time
  const getCurrentMealType = (): "breakfast" | "lunch" | "snacks" | "dinner" | null => {
    if (selectedDay !== currentDay) return null;
    const now = new Date();
    const istHours = Number(
      now.toLocaleTimeString("en-US", {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: "numeric",
      })
    );
    const istMinutes = Number(
      now.toLocaleTimeString("en-US", {
        timeZone: "Asia/Kolkata",
        minute: "numeric",
      })
    );
    const totalMinutes = istHours * 60 + istMinutes;

    if (totalMinutes >= 7 * 60 && totalMinutes <= 10 * 60) return "breakfast";
    if (totalMinutes > 10 * 60 && totalMinutes <= 15 * 60) return "lunch";
    if (totalMinutes > 15 * 60 && totalMinutes <= 18 * 60 + 30) return "snacks";
    if (totalMinutes > 18 * 60 + 30 && totalMinutes <= 22 * 60) return "dinner";
    return null;
  };

  const currentMealType = getCurrentMealType();

  const startEditing = () => {
    setEditFormData({
      breakfast: (activeMenu.breakfast || []).join(", "),
      lunch: (activeMenu.lunch || []).join(", "),
      snacks: (activeMenu.snacks || []).join(", "),
      dinner: (activeMenu.dinner || []).join(", "),
      specialNotes: activeMenu.specialNotes || "",
    });
    setEditingDay(selectedDay);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/mess-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: selectedDay,
          breakfast: editFormData.breakfast.split(",").map((s) => s.trim()).filter(Boolean),
          lunch: editFormData.lunch.split(",").map((s) => s.trim()).filter(Boolean),
          snacks: editFormData.snacks.split(",").map((s) => s.trim()).filter(Boolean),
          dinner: editFormData.dinner.split(",").map((s) => s.trim()).filter(Boolean),
          specialNotes: editFormData.specialNotes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMenus((prev) =>
          prev.map((m) => (m.dayOfWeek === selectedDay ? json.menu : m))
        );
        setEditingDay(null);
      } else {
        alert(json.message || "Failed to update menu");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Error saving menu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border bg-card p-5 sm:p-6 shadow-sm space-y-5">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Utensils className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                Hostel Mess & Cafeteria Schedule
              </h3>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                Weekly Menu
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Daily breakfast, lunch, snacks & dinner timetable for campus dining
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={startEditing}
            className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-all"
          >
            <Edit2 className="h-3.5 w-3.5 text-primary" />
            <span>Edit Menu</span>
          </button>
          <Link
            href="/mess-menu"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <span>Full Week</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Days of the week tabs */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
        {DAYS.map((dayName, idx) => {
          const isSelected = selectedDay === idx;
          const isToday = currentDay === idx;
          return (
            <button
              key={dayName}
              onClick={() => setSelectedDay(idx)}
              className={`flex-1 min-w-[44px] py-2 px-1 rounded-2xl text-xs font-bold transition-all relative flex flex-col items-center gap-1 ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{dayName}</span>
              {isToday && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isSelected ? "bg-white" : "bg-primary"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Special notes if any */}
      {activeMenu.specialNotes && (
        <div className="flex items-center gap-2 rounded-2xl bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-500 border border-amber-500/20">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>{activeMenu.specialNotes}</span>
        </div>
      )}

      {/* Meals Grid (4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Breakfast */}
        <MealCard
          title="Breakfast"
          icon={<Coffee className="h-4 w-4" />}
          timing={activeMenu.timings?.breakfast || "07:30 - 09:30 AM"}
          items={activeMenu.breakfast || []}
          isCurrent={currentMealType === "breakfast"}
          color="amber"
        />

        {/* 2. Lunch */}
        <MealCard
          title="Lunch"
          icon={<Sun className="h-4 w-4" />}
          timing={activeMenu.timings?.lunch || "12:30 - 02:30 PM"}
          items={activeMenu.lunch || []}
          isCurrent={currentMealType === "lunch"}
          color="blue"
        />

        {/* 3. Snacks */}
        <MealCard
          title="Evening Snacks"
          icon={<Utensils className="h-4 w-4" />}
          timing={activeMenu.timings?.snacks || "04:30 - 05:45 PM"}
          items={activeMenu.snacks || []}
          isCurrent={currentMealType === "snacks"}
          color="purple"
        />

        {/* 4. Dinner */}
        <MealCard
          title="Dinner"
          icon={<Moon className="h-4 w-4" />}
          timing={activeMenu.timings?.dinner || "07:30 - 09:30 PM"}
          items={activeMenu.dinner || []}
          isCurrent={currentMealType === "dinner"}
          color="emerald"
        />
      </div>

      {/* Edit Menu Modal */}
      {editingDay !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-primary" />
                <h4 className="text-base font-bold text-foreground">
                  Edit Menu for {FULL_DAYS[selectedDay]}
                </h4>
              </div>
              <button
                onClick={() => setEditingDay(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Enter items separated by commas (e.g. Masala Dosa, Sambar, Coconut Chutney, Coffee).
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-foreground block mb-1">
                  🌅 Breakfast Items
                </label>
                <input
                  type="text"
                  value={editFormData.breakfast}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, breakfast: e.target.value })
                  }
                  className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Idli, Sambar, Vada, Tea"
                />
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">
                  ☀️ Lunch Items
                </label>
                <input
                  type="text"
                  value={editFormData.lunch}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, lunch: e.target.value })
                  }
                  className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Rice, Dal Tadka, Paneer Butter Masala, Roti, Curd"
                />
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">
                  ☕ Evening Snacks Items
                </label>
                <input
                  type="text"
                  value={editFormData.snacks}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, snacks: e.target.value })
                  }
                  className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Samosa, Green Chutney, Masala Chai"
                />
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">
                  🌙 Dinner Items
                </label>
                <input
                  type="text"
                  value={editFormData.dinner}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, dinner: e.target.value })
                  }
                  className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Veg Biryani, Mirchi Salan, Raita, Gulab Jamun"
                />
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">
                  ✨ Special Note / Dish (Optional)
                </label>
                <input
                  type="text"
                  value={editFormData.specialNotes}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, specialNotes: e.target.value })
                  }
                  className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Special Feast Night / Ice cream provided"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setEditingDay(null)}
                className="rounded-xl border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90"
              >
                {saving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Save Menu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MealCard({
  title,
  icon,
  timing,
  items,
  isCurrent,
  color,
}: {
  title: string;
  icon: React.ReactNode;
  timing: string;
  items: string[];
  isCurrent: boolean;
  color: "amber" | "blue" | "purple" | "emerald";
}) {
  const colorMap = {
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  };

  return (
    <div
      className={`rounded-2xl border p-4 transition-all relative flex flex-col justify-between ${
        isCurrent
          ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/40"
          : "bg-muted/30 border-border/70 hover:bg-muted/50"
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-xl border ${colorMap[color]}`}>
              {icon}
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">{title}</h4>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {timing}
              </span>
            </div>
          </div>

          {isCurrent && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-extrabold text-primary animate-pulse border border-primary/30">
              NOW
            </span>
          )}
        </div>

        {/* Meal items list */}
        <div className="mt-2.5 space-y-1">
          {items.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">
              Menu not set for this slot.
            </p>
          ) : (
            items.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-1.5 text-xs text-foreground/90 font-medium"
              >
                <span className="text-primary text-[10px] mt-0.5">•</span>
                <span className="leading-tight">{item}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
