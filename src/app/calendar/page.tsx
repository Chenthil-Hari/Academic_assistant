"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<"month" | "list">("month");
  const [filterType, setFilterType] = useState("All");
  const [loading, setLoading] = useState(true);

  // Add event modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    type: "Exam",
    date: new Date().toISOString().split("T")[0],
    endDate: "",
    subjectId: "",
    description: "",
    isHoliday: false,
  });

  useEffect(() => {
    loadEvents();
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewType("list");
    }
  }, [filterType, currentDate]); // BUG FIX: re-fetch when month changes too

  const loadEvents = async () => {
    setLoading(true);
    try {
      let url = "/api/calendar";
      if (filterType !== "All") url += `?type=${filterType}`;

      const [evRes, subRes] = await Promise.all([
        fetch(url),
        fetch("/api/subjects"),
      ]);
      const [evJson, subJson] = await Promise.all([evRes.json(), subRes.json()]);

      if (evJson.success) setEvents(evJson.events || []);
      if (subJson.success) setSubjects(subJson.subjects || []);
    } catch (err) {
      console.error("Calendar load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewEvent({
          title: "",
          type: "Exam",
          date: new Date().toISOString().split("T")[0],
          endDate: "",
          subjectId: "",
          description: "",
          isHoliday: false,
        });
        loadEvents();
      } else {
        alert(data.message || "Failed to create event.");
      }
    } catch (err) {
      alert("Error adding calendar event.");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Delete this academic event?")) return;
    try {
      const res = await fetch(`/api/calendar/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) loadEvents();
    } catch (err) {
      alert("Failed to delete event.");
    }
  };

  // Month navigation helpers
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Days in month
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Academic Calendar
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Track exams, assignment deadlines, institutional holidays, and semester milestones.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border bg-card p-1">
              <button
                onClick={() => setViewType("month")}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  viewType === "month"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly Grid
              </button>
              <button
                onClick={() => setViewType("list")}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  viewType === "list"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                List View
              </button>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Add Event</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          {["All", "Exam", "Assignment", "Holiday", "Event"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterType(cat)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                filterType === cat
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat === "All" ? "All Categories" : cat}
            </button>
          ))}
        </div>

        {/* Monthly Grid View */}
        {viewType === "month" ? (
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            {/* Month Header Navigation */}
            <div className="flex items-center justify-between pb-3 border-b">
              <h2 className="text-lg font-black text-foreground">
                {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h2>

              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="rounded-xl border p-2 text-muted-foreground hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="rounded-xl border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  className="rounded-xl border p-2 text-muted-foreground hover:bg-muted"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Weekdays and Days matrix with horizontal scroll on mobile */}
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[580px] space-y-2">
                {/* Weekdays header */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground uppercase">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days matrix */}
                <div className="grid grid-cols-7 gap-1.5">
                  {/* Empty leading padding */}
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-24 rounded-2xl bg-muted/10 p-2" />
                  ))}

                  {/* Month days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                    // BUG FIX: apply filterType to month grid, not just list view
                    const dayEvents = events
                      .filter((e) => e.date.startsWith(dateStr))
                      .filter((e) => filterType === "All" || e.type === filterType);

                    const isToday =
                      new Date().getDate() === dayNum &&
                      new Date().getMonth() === month &&
                      new Date().getFullYear() === year;

                    return (
                      <div
                        key={dayNum}
                        className={`min-h-24 rounded-2xl border p-2 flex flex-col justify-between transition-colors ${
                          isToday ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "bg-card/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold ${
                              isToday ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {dayNum}
                          </span>
                        </div>

                        <div className="space-y-1 mt-1 overflow-y-auto max-h-16">
                          {dayEvents.map((ev) => (
                            <div
                              key={ev._id}
                              className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold truncate ${
                                ev.type === "Exam"
                                  ? "bg-red-500/15 text-red-500"
                                  : ev.type === "Assignment"
                                  ? "bg-amber-500/15 text-amber-500"
                                  : ev.type === "Holiday"
                                  ? "bg-emerald-500/15 text-emerald-500"
                                  : "bg-blue-500/15 text-blue-500"
                              }`}
                            >
                              {ev.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-foreground">All Scheduled Academic Events</h2>

            <div className="divide-y divide-border">
              {events.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No events found in this category.
                </p>
              ) : (
                events.map((ev) => (
                  <div key={ev._id} className="py-3.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{ev.title}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            ev.type === "Exam"
                              ? "bg-red-500/10 text-red-500"
                              : ev.type === "Assignment"
                              ? "bg-amber-500/10 text-amber-500"
                              : ev.type === "Holiday"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-blue-500/10 text-blue-500"
                          }`}
                        >
                          {ev.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(ev.date)} {ev.endDate && `– ${formatDate(ev.endDate)}`}
                        {ev.subjectId && ` • ${ev.subjectId.code} (${ev.subjectId.name})`}
                      </p>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground/80 mt-1">{ev.description}</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteEvent(ev._id)}
                      className="rounded-xl p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Delete event"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Add Event Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border bg-card p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-base text-foreground">Add Academic Event</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddEvent} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Title *</label>
                  <input
                    type="text"
                    required
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="e.g. Midterm Examination / Diwali Break"
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Event Type *</label>
                    <select
                      value={newEvent.type}
                      onChange={(e) => {
                        const t = e.target.value;
                        setNewEvent({ ...newEvent, type: t, isHoliday: t === "Holiday" });
                      }}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                    >
                      <option value="Exam">Exam</option>
                      <option value="Assignment">Assignment</option>
                      <option value="Holiday">Holiday</option>
                      <option value="Event">Event</option>
                      <option value="SemesterStart">Semester Start</option>
                      <option value="SemesterEnd">Semester End</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Associated Subject</label>
                    <select
                      value={newEvent.subjectId}
                      onChange={(e) => setNewEvent({ ...newEvent, subjectId: e.target.value })}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                    >
                      <option value="">None / General</option>
                      {subjects.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">End Date (optional)</label>
                    <input
                      type="date"
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isHoliday"
                    checked={newEvent.isHoliday}
                    onChange={(e) => setNewEvent({ ...newEvent, isHoliday: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary"
                  />
                  <label htmlFor="isHoliday" className="font-medium text-foreground cursor-pointer">
                    Mark as Academic Holiday (Cancels timetable classes for this day)
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Description (optional)</label>
                  <textarea
                    rows={2}
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Additional exam syllabus or notes..."
                    className="w-full rounded-xl border bg-background px-3 py-2 text-foreground focus:outline-none"
                  />
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
                    Save Event
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
