"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  CalendarDays,
  Plus,
  Clock,
  MapPin,
  Trash2,
  Edit2,
  X,
  UploadCloud,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { formatTime } from "@/lib/utils";

const DAYS = [
  { index: 1, name: "Monday" },
  { index: 2, name: "Tuesday" },
  { index: 3, name: "Wednesday" },
  { index: 4, name: "Thursday" },
  { index: 5, name: "Friday" },
  { index: 6, name: "Saturday" },
];

export default function TimetablePage() {
  const [slots, setSlots] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [activeDay, setActiveDay] = useState(new Date().getDay() || 1); // default today or Mon
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("weekly");
  const [loading, setLoading] = useState(true);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSlot, setNewSlot] = useState({
    subjectId: "",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:00",
    room: "",
    type: "Lecture",
  });

  useEffect(() => {
    loadTimetable();
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("daily");
    }
  }, []);

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const [timeRes, subRes] = await Promise.all([
        fetch("/api/timetable"),
        fetch("/api/subjects"),
      ]);
      const [timeJson, subJson] = await Promise.all([timeRes.json(), subRes.json()]);

      if (timeJson.success) setSlots(timeJson.slots || []);
      if (subJson.success) {
        setSubjects(subJson.subjects || []);
        if (subJson.subjects?.length > 0 && !newSlot.subjectId) {
          setNewSlot((prev) => ({ ...prev, subjectId: subJson.subjects[0]._id }));
        }
      }
    } catch (err) {
      console.error("Timetable load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSlot),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        loadTimetable();
      } else {
        alert(data.message || "Failed to add slot.");
      }
    } catch (err) {
      alert("Error adding slot.");
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm("Remove this timetable slot?")) return;
    try {
      const res = await fetch(`/api/timetable/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        loadTimetable();
      }
    } catch (err) {
      alert("Failed to delete slot.");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Weekly Timetable
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Define your schedule to automate the daily 4:00 PM attendance check-in.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border bg-card p-1">
              <button
                onClick={() => setViewMode("weekly")}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  viewMode === "weekly"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Weekly Matrix
              </button>
              <button
                onClick={() => setViewMode("daily")}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  viewMode === "daily"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Daily View
              </button>
            </div>

            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-sm transition-all"
            >
              <UploadCloud className="h-4 w-4 text-primary" />
              <span>Import PDF</span>
            </Link>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Add Class Slot</span>
            </button>
          </div>
        </div>

        {/* Weekly Matrix View */}
        {viewMode === "weekly" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {DAYS.map((day) => {
              const daySlots = slots.filter((s) => s.dayOfWeek === day.index);
              const isToday = new Date().getDay() === day.index;

              return (
                <div
                  key={day.index}
                  className={`flex flex-col rounded-3xl border bg-card/60 p-4 shadow-sm backdrop-blur-sm ${
                    isToday ? "border-primary ring-1 ring-primary/30" : ""
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b">
                    <span className="font-extrabold text-sm text-foreground">
                      {day.name}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary uppercase">
                        Today
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2.5 pt-3">
                    {daySlots.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        No classes
                      </div>
                    ) : (
                      daySlots.map((slot) => (
                        <div
                          key={slot._id}
                          className="group relative rounded-2xl border bg-muted/40 p-3 hover:border-primary/50 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-extrabold text-xs text-foreground">
                              {slot.subjectId?.code || "Subject"}
                            </span>
                            <button
                              onClick={() => handleDeleteSlot(slot._id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                              title="Delete slot"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {slot.subjectId?.name}
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t">
                            <span className="font-semibold text-foreground">
                              {formatTime(slot.timeSlot.startTime)} - {formatTime(slot.timeSlot.endTime)}
                            </span>
                            {slot.room && <span>{slot.room}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Daily View */
          <div className="space-y-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {DAYS.map((d) => (
                <button
                  key={d.index}
                  onClick={() => setActiveDay(d.index)}
                  className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition-all ${
                    activeDay === d.index
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>

            <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-lg text-foreground">
                Classes on {DAYS.find((d) => d.index === activeDay)?.name}
              </h3>

              {slots.filter((s) => s.dayOfWeek === activeDay).length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No classes scheduled for this day.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {slots
                    .filter((s) => s.dayOfWeek === activeDay)
                    .map((slot) => (
                      <div
                        key={slot._id}
                        className="rounded-2xl border bg-muted/30 p-4 space-y-2 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-foreground">
                            {slot.subjectId?.code}
                          </span>
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {slot.type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {slot.subjectId?.name}
                        </p>

                        <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1 font-semibold text-foreground">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            <span>
                              {formatTime(slot.timeSlot.startTime)} - {formatTime(slot.timeSlot.endTime)}
                            </span>
                          </div>
                          {slot.room && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{slot.room}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Slot Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-base text-foreground">Add Timetable Slot</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddSlot} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Subject *</label>
                  <select
                    required
                    value={newSlot.subjectId}
                    onChange={(e) => setNewSlot({ ...newSlot, subjectId: e.target.value })}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                  >
                    <option value="">-- Select Subject --</option>
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Day of Week *</label>
                  <select
                    value={newSlot.dayOfWeek}
                    onChange={(e) => setNewSlot({ ...newSlot, dayOfWeek: Number(e.target.value) })}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                  >
                    {DAYS.map((d) => (
                      <option key={d.index} value={d.index}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Start Time *</label>
                    <input
                      type="time"
                      required
                      value={newSlot.startTime}
                      onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">End Time *</label>
                    <input
                      type="time"
                      required
                      value={newSlot.endTime}
                      onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Room / Venue</label>
                    <input
                      type="text"
                      value={newSlot.room}
                      onChange={(e) => setNewSlot({ ...newSlot, room: e.target.value })}
                      placeholder="e.g. LH-3"
                      className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Class Type</label>
                    <select
                      value={newSlot.type}
                      onChange={(e) => setNewSlot({ ...newSlot, type: e.target.value })}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                    >
                      <option value="Lecture">Lecture</option>
                      <option value="Lab">Lab</option>
                      <option value="Tutorial">Tutorial</option>
                      <option value="Seminar">Seminar</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-xl border px-4 py-2 text-foreground hover:bg-muted font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-primary px-4 py-2 text-primary-foreground font-semibold"
                  >
                    Add Slot
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
