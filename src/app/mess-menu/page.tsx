"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Utensils,
  Coffee,
  Sun,
  Moon,
  Clock,
  Sparkles,
  Edit2,
  Calendar,
  Check,
  X,
  FileSpreadsheet,
} from "lucide-react";

const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon - Sun
const DAY_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  0: "Sunday",
};

export default function MessMenuPage() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDay, setCurrentDay] = useState(1);
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
          setCurrentDay(json.currentDayOfWeek);
        }
      }
    } catch (err) {
      console.error("Failed to load menus:", err);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (dayIdx: number) => {
    const target = menus.find((m) => m.dayOfWeek === dayIdx) || {
      breakfast: [],
      lunch: [],
      snacks: [],
      dinner: [],
      specialNotes: "",
    };
    setEditFormData({
      breakfast: (target.breakfast || []).join(", "),
      lunch: (target.lunch || []).join(", "),
      snacks: (target.snacks || []).join(", "),
      dinner: (target.dinner || []).join(", "),
      specialNotes: target.specialNotes || "",
    });
    setEditingDay(dayIdx);
  };

  const handleSave = async () => {
    if (editingDay === null) return;
    setSaving(true);
    try {
      const res = await fetch("/api/mess-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: editingDay,
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
          prev.map((m) => (m.dayOfWeek === editingDay ? json.menu : m))
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
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-500 mb-2 border border-emerald-500/20">
              <Utensils className="h-3 w-3" />
              <span>Campus Life & Dining</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Hostel Mess & Cafeteria Timetable
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Weekly breakfast, lunch, tea/snacks, and dinner schedule for your college dining hall
            </p>
          </div>
        </div>

        {/* Timings Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border bg-card p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Coffee className="h-3 w-3 text-amber-500" /> Breakfast
            </span>
            <div className="text-xs font-black text-foreground">07:30 – 09:30 AM</div>
          </div>

          <div className="rounded-2xl border bg-card p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Sun className="h-3 w-3 text-blue-500" /> Lunch
            </span>
            <div className="text-xs font-black text-foreground">12:30 – 02:30 PM</div>
          </div>

          <div className="rounded-2xl border bg-card p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Utensils className="h-3 w-3 text-purple-500" /> Snacks & Tea
            </span>
            <div className="text-xs font-black text-foreground">04:30 – 05:45 PM</div>
          </div>

          <div className="rounded-2xl border bg-card p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Moon className="h-3 w-3 text-emerald-500" /> Dinner
            </span>
            <div className="text-xs font-black text-foreground">07:30 – 09:30 PM</div>
          </div>
        </div>

        {/* Weekly Cards List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-3xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {DAYS_ORDER.map((dayIdx) => {
              const menu = menus.find((m) => m.dayOfWeek === dayIdx) || {
                breakfast: [],
                lunch: [],
                snacks: [],
                dinner: [],
                specialNotes: "",
              };
              const isToday = currentDay === dayIdx;

              return (
                <div
                  key={dayIdx}
                  className={`rounded-3xl border p-5 sm:p-6 transition-all relative ${
                    isToday
                      ? "border-primary bg-primary/[0.02] shadow-sm ring-1 ring-primary/30"
                      : "bg-card"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-extrabold text-foreground">
                        {DAY_LABELS[dayIdx]}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                          Today
                        </span>
                      )}
                      {menu.specialNotes && (
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/20">
                          {menu.specialNotes}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => startEditing(dayIdx)}
                      className="inline-flex items-center gap-1.5 rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted self-start sm:self-auto"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-primary" />
                      <span>Edit {DAY_LABELS[dayIdx]}</span>
                    </button>
                  </div>

                  {/* 4 Meals Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    {/* Breakfast */}
                    <div className="rounded-2xl bg-muted/30 p-3.5 space-y-1.5 border border-border/50">
                      <div className="font-bold text-amber-500 flex items-center gap-1.5">
                        <Coffee className="h-3.5 w-3.5" />
                        <span>Breakfast</span>
                      </div>
                      <div className="text-foreground/90 space-y-1 font-medium">
                        {(menu.breakfast || []).map((item: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span className="text-primary">•</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Lunch */}
                    <div className="rounded-2xl bg-muted/30 p-3.5 space-y-1.5 border border-border/50">
                      <div className="font-bold text-blue-500 flex items-center gap-1.5">
                        <Sun className="h-3.5 w-3.5" />
                        <span>Lunch</span>
                      </div>
                      <div className="text-foreground/90 space-y-1 font-medium">
                        {(menu.lunch || []).map((item: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span className="text-primary">•</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Snacks */}
                    <div className="rounded-2xl bg-muted/30 p-3.5 space-y-1.5 border border-border/50">
                      <div className="font-bold text-purple-500 flex items-center gap-1.5">
                        <Utensils className="h-3.5 w-3.5" />
                        <span>Evening Snacks</span>
                      </div>
                      <div className="text-foreground/90 space-y-1 font-medium">
                        {(menu.snacks || []).map((item: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span className="text-primary">•</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dinner */}
                    <div className="rounded-2xl bg-muted/30 p-3.5 space-y-1.5 border border-border/50">
                      <div className="font-bold text-emerald-500 flex items-center gap-1.5">
                        <Moon className="h-3.5 w-3.5" />
                        <span>Dinner</span>
                      </div>
                      <div className="text-foreground/90 space-y-1 font-medium">
                        {(menu.dinner || []).map((item: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span className="text-primary">•</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Modal */}
        {editingDay !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-primary" />
                  <h4 className="text-base font-bold text-foreground">
                    Edit Menu for {DAY_LABELS[editingDay]}
                  </h4>
                </div>
                <button
                  onClick={() => setEditingDay(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-foreground block mb-1">
                    🌅 Breakfast Items (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editFormData.breakfast}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, breakfast: e.target.value })
                    }
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">
                    ☀️ Lunch Items (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editFormData.lunch}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, lunch: e.target.value })
                    }
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">
                    ☕ Evening Snacks Items (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editFormData.snacks}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, snacks: e.target.value })
                    }
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">
                    🌙 Dinner Items (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editFormData.dinner}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, dinner: e.target.value })
                    }
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">
                    ✨ Special Note / Dish
                  </label>
                  <input
                    type="text"
                    value={editFormData.specialNotes}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, specialNotes: e.target.value })
                    }
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. Special weekend sweet served"
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
                  onClick={handleSave}
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
    </AppLayout>
  );
}
