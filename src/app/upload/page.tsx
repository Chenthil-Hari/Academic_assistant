"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ArrowRight,
  Sparkles,
  Eye,
  Check,
  Calendar,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [docType, setDocType] = useState<"timetable_pdf" | "academic_calendar_pdf">("timetable_pdf");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [usedOcr, setUsedOcr] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Extracted Data for review & editing
  const [subjects, setSubjects] = useState<any[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [step, setStep] = useState<"upload" | "verify" | "done">("upload");
  const [saving, setSaving] = useState(false);
  const [rawText, setRawText] = useState("");
  const [showRawText, setShowRawText] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith(".pdf")) {
        setError("Only .pdf files are supported.");
        return;
      }
      setFile(selected);
      setError("");
    }
  };

  const handleUploadAndExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a PDF file.");
      return;
    }

    setUploading(true);
    setError("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s safety limit

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", docType);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: any;
      const responseText = await res.text();
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        throw new Error(
          res.status === 504 || responseText.toLowerCase().includes("error")
            ? "Server timeout processing the document. Please re-upload or check your file."
            : `Server error (${res.status}): ${responseText.slice(0, 100)}`
        );
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to parse document.");
      }

      setDocumentId(data.documentId);
      setUsedOcr(Boolean(data.usedOcr));
      setSubjects(data.extractedData?.subjects || []);
      setTimetableSlots(data.extractedData?.timetableSlots || []);
      setCalendarEvents(data.extractedData?.calendarEvents || []);
      setRawText(data.rawText || "");
      setStep("verify");
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setError("Extraction took longer than expected (>20s). Please ensure your PDF is clear or try again.");
      } else {
        setError(err.message || "Error processing PDF.");
      }
    } finally {
      setUploading(false);
    }
  };

  // Editing helpers for verification
  const handleUpdateSubject = (index: number, field: string, val: any) => {
    const updated = [...subjects];
    updated[index][field] = val;
    setSubjects(updated);
  };
  const handleRemoveSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };
  const handleAddEmptySubject = () => {
    setSubjects([...subjects, { code: "NEW101", name: "New Subject", credit: 3 }]);
  };

  const handleUpdateSlot = (index: number, field: string, val: any) => {
    const updated = [...timetableSlots];
    updated[index][field] = val;
    setTimetableSlots(updated);
  };
  const handleRemoveSlot = (index: number) => {
    setTimetableSlots(timetableSlots.filter((_, i) => i !== index));
  };
  const handleAddEmptySlot = () => {
    setTimetableSlots([
      ...timetableSlots,
      {
        subjectCode: subjects[0]?.code || "SUB",
        subjectName: subjects[0]?.name || "Subject",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        room: "LH-1",
        type: "Lecture",
      },
    ]);
  };

  const handleUpdateEvent = (index: number, field: string, val: any) => {
    const updated = [...calendarEvents];
    updated[index][field] = val;
    setCalendarEvents(updated);
  };
  const handleRemoveEvent = (index: number) => {
    setCalendarEvents(calendarEvents.filter((_, i) => i !== index));
  };
  const handleAddEmptyEvent = () => {
    setCalendarEvents([
      ...calendarEvents,
      {
        title: "New Exam / Event",
        type: "Exam",
        date: new Date().toISOString().split("T")[0],
        isHoliday: false,
      },
    ]);
  };

  const handleConfirmAndSave = async () => {
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/upload/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          subjects,
          timetableSlots,
          calendarEvents,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save verified data.");
      }

      setSuccessMessage(data.message);
      setStep("done");
    } catch (err: any) {
      setError(err.message || "Error saving academic data.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            PDF Upload & Academic Extraction
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Upload your weekly timetable or academic calendar PDF. Includes OCR for scanned files and an interactive review step before saving.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-destructive/10 p-3.5 text-xs text-destructive border border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Upload Dropzone */}
        {step === "upload" && (
          <form onSubmit={handleUploadAndExtract} className="space-y-6">
            <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Step 1: Select Document Type
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setDocType("timetable_pdf")}
                  className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                    docType === "timetable_pdf"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-bold text-sm text-foreground">Weekly Timetable PDF</div>
                      <div className="text-xs text-muted-foreground">
                        Extracts subjects, days of the week, lecture/lab slots, and room numbers.
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setDocType("academic_calendar_pdf")}
                  className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                    docType === "academic_calendar_pdf"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-indigo-500" />
                    <div>
                      <div className="font-bold text-sm text-foreground">Academic Calendar PDF</div>
                      <div className="text-xs text-muted-foreground">
                        Extracts exams, assignment deadlines, holidays, and semester date boundaries.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* File Dropzone */}
              <div className="mt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Step 2: Choose PDF File
                </label>

                <div className="relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border p-10 text-center hover:bg-muted/20 transition-colors">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
                    <UploadCloud className="h-7 w-7" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {file ? file.name : "Click or drag & drop PDF here"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports native PDF text and scanned document images via OCR (up to 10MB)
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Extracting Academic Data...</span>
                    </>
                  ) : (
                    <>
                      <span>Extract Academic Information</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Step 2: Verification and Editing */}
        {step === "verify" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Sparkles className="h-4 w-4" />
                <span>
                  Extraction Complete {usedOcr ? "(Used OCR)" : ""}. Please review and adjust the extracted data before saving.
                </span>
              </div>
              <button
                onClick={() => setStep("upload")}
                className="text-xs text-muted-foreground hover:underline"
              >
                Upload different file
              </button>
            </div>

            {/* Extracted Subjects Section - Shown ONLY for Timetable PDF */}
            {docType === "timetable_pdf" && (
              <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-foreground">Detected Subjects ({subjects.length})</h3>
                    <p className="text-xs text-muted-foreground">Verify subject codes, names, and credit weighting</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEmptySubject}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Subject</span>
                  </button>
                </div>

                {subjects.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-center space-y-2">
                    <p className="text-xs text-muted-foreground">
                      No subjects were automatically detected. Click below to add your subjects directly:
                    </p>
                    <button
                      type="button"
                      onClick={handleAddEmptySubject}
                      className="inline-flex items-center gap-1.5 rounded-xl border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      <Plus className="h-4 w-4 text-primary" />
                      <span>Add First Subject</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[500px]">
                      <thead className="border-b bg-muted/30 text-muted-foreground uppercase text-[10px] font-bold">
                        <tr>
                          <th className="px-3 py-2 w-32">Code</th>
                          <th className="px-3 py-2">Subject Name</th>
                          <th className="px-3 py-2 w-24">Credits</th>
                          <th className="px-3 py-2 text-right w-16">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {subjects.map((sub, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={sub.code}
                                onChange={(e) => handleUpdateSubject(idx, "code", e.target.value.toUpperCase())}
                                className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground w-full"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={sub.name}
                                onChange={(e) => handleUpdateSubject(idx, "name", e.target.value)}
                                className="rounded-lg border bg-background px-2.5 py-1.5 text-xs text-foreground w-full"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={1}
                                max={8}
                                value={sub.credit || 3}
                                onChange={(e) => handleUpdateSubject(idx, "credit", Number(e.target.value))}
                                className="rounded-lg border bg-background px-2.5 py-1.5 text-xs text-foreground w-full"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveSubject(idx)}
                                className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted"
                                title="Remove Subject"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Extracted Timetable Slots */}
            {docType === "timetable_pdf" && (
              <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-foreground">
                      Detected Timetable Slots ({timetableSlots.length})
                    </h3>
                    <p className="text-xs text-muted-foreground">Verify days of week, start times, and rooms</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEmptySlot}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Slot</span>
                  </button>
                </div>

                {timetableSlots.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-center space-y-2">
                    <p className="text-xs text-muted-foreground">
                      No timetable hours mapped automatically. Click below to add your class slots:
                    </p>
                    <button
                      type="button"
                      onClick={handleAddEmptySlot}
                      className="inline-flex items-center gap-1.5 rounded-xl border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      <Plus className="h-4 w-4 text-primary" />
                      <span>Add First Slot</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[550px]">
                      <thead className="border-b bg-muted/30 text-muted-foreground uppercase text-[10px] font-bold">
                        <tr>
                          <th className="px-3 py-2">Subject Code</th>
                          <th className="px-3 py-2">Day</th>
                          <th className="px-3 py-2">Start Time</th>
                          <th className="px-3 py-2">End Time</th>
                          <th className="px-3 py-2">Room</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {timetableSlots.map((slot, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={slot.subjectCode}
                                onChange={(e) => handleUpdateSlot(idx, "subjectCode", e.target.value.toUpperCase())}
                                className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground w-28"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={slot.dayOfWeek}
                                onChange={(e) => handleUpdateSlot(idx, "dayOfWeek", Number(e.target.value))}
                                className="rounded-lg border bg-background px-2 py-1.5 text-xs text-foreground"
                              >
                                <option value={1}>Monday</option>
                                <option value={2}>Tuesday</option>
                                <option value={3}>Wednesday</option>
                                <option value={4}>Thursday</option>
                                <option value={5}>Friday</option>
                                <option value={6}>Saturday</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => handleUpdateSlot(idx, "startTime", e.target.value)}
                                className="rounded-lg border bg-background px-2 py-1.5 text-xs text-foreground"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => handleUpdateSlot(idx, "endTime", e.target.value)}
                                className="rounded-lg border bg-background px-2 py-1.5 text-xs text-foreground"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={slot.room || ""}
                                onChange={(e) => handleUpdateSlot(idx, "room", e.target.value)}
                                placeholder="LH-1"
                                className="rounded-lg border bg-background px-2 py-1.5 text-xs text-foreground w-20"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(idx)}
                                className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted"
                                title="Remove slot"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Extracted Calendar Events */}
            {docType === "academic_calendar_pdf" && (
              <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-foreground">
                      Detected Calendar Events ({calendarEvents.length})
                    </h3>
                    <p className="text-xs text-muted-foreground">Exams, assignments, and holidays</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEmptyEvent}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Event</span>
                  </button>
                </div>

                {calendarEvents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-center space-y-2">
                    <p className="text-xs text-muted-foreground">
                      No calendar events found. Click below to add an event:
                    </p>
                    <button
                      type="button"
                      onClick={handleAddEmptyEvent}
                      className="inline-flex items-center gap-1.5 rounded-xl border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      <Plus className="h-4 w-4 text-primary" />
                      <span>Add Event</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[500px]">
                      <thead className="border-b bg-muted/30 text-muted-foreground uppercase text-[10px] font-bold">
                        <tr>
                          <th className="px-3 py-2">Title</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {calendarEvents.map((ev, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={ev.title}
                                onChange={(e) => handleUpdateEvent(idx, "title", e.target.value)}
                                className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground w-full"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={ev.type}
                                onChange={(e) => {
                                  const t = e.target.value;
                                  handleUpdateEvent(idx, "type", t);
                                  handleUpdateEvent(idx, "isHoliday", t === "Holiday");
                                }}
                                className="rounded-lg border bg-background px-2 py-1.5 text-xs text-foreground"
                              >
                                <option value="Exam">Exam</option>
                                <option value="Assignment">Assignment</option>
                                <option value="Holiday">Holiday</option>
                                <option value="Event">Event</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="date"
                                value={ev.date?.split("T")[0] || ev.date}
                                onChange={(e) => handleUpdateEvent(idx, "date", e.target.value)}
                                className="rounded-lg border bg-background px-2 py-1.5 text-xs text-foreground"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveEvent(idx)}
                                className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted"
                                title="Remove event"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Document Text Preview Collapsible */}
            {rawText && (
              <div className="rounded-3xl border bg-card p-5 shadow-sm space-y-3">
                <button
                  type="button"
                  onClick={() => setShowRawText(!showRawText)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="font-bold text-xs text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>View Extracted Document Text ({rawText.length} characters)</span>
                  </span>
                  <span className="text-xs text-primary font-semibold hover:underline">
                    {showRawText ? "Hide Text" : "Show Text"}
                  </span>
                </button>

                {showRawText && (
                  <pre className="mt-2 p-4 rounded-2xl bg-muted/40 text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto font-mono">
                    {rawText}
                  </pre>
                )}
              </div>
            )}

            {/* Confirm & Save Button */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setStep("upload")}
                className="rounded-2xl border px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Back to Upload
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmAndSave}
                className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>Confirm & Save to Academic AI</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success state */}
        {step === "done" && (
          <div className="rounded-3xl border bg-card p-10 shadow-sm text-center space-y-6 max-w-lg mx-auto">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Import Successful!</h2>
              <p className="text-xs text-muted-foreground">{successMessage}</p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Link
                href="/timetable"
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                View Timetable
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl border bg-card px-5 py-2.5 text-xs font-bold text-foreground hover:bg-muted"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
