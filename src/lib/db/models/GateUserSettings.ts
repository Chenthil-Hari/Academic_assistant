import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGateUserSettings extends Document {
  userId: mongoose.Types.ObjectId;
  // Exam identity — fully customizable per user
  examType: string; // e.g. "GATE CS", "GATE DA", "GATE ECE", "UPSC", "CAT", "GRE", "Custom"
  examLabel: string; // e.g. "GATE 2027" — shown in sidebar & UI
  targetYear: number; // e.g. 2027
  targetScore: number; // e.g. 65 (out of 100 for GATE)
  studyStyle: "videos" | "chapters" | "topics" | "problems" | "hours"; // preparation style per user
  isConfigured: boolean; // false for new users until they set their target & study style
  dailyStudyHours: number; // default: 10
  studyDaysPerWeek: number; // default: 6
  restDayOfWeek: number; // default: 0 (Sunday)
  phase1Deadline: Date; // default: 2026-12-31
  pyqStartDate: Date; // default: 2027-01-01
  gateExamDate: Date; // default: 2027-02-06 (GATE 2027 Exam Date)
  currentPhase: "Phase 1 - Lectures & Concept" | "Phase 2 - PYQ Practice";
  playbackSpeed: number; // default: 1.0
  revisionHoursDaily: number; // e.g. 1.0 hour inside the 10 hours
  createdAt: Date;
  updatedAt: Date;
}

const GateUserSettingsSchema = new Schema<IGateUserSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    examType: {
      type: String,
      default: "GATE CS",
      trim: true,
    },
    examLabel: {
      type: String,
      default: "GATE 2027",
      trim: true,
    },
    targetYear: {
      type: Number,
      default: 2027,
      min: 2024,
      max: 2035,
    },
    targetScore: {
      type: Number,
      default: 65,
      min: 1,
      max: 100,
    },
    studyStyle: {
      type: String,
      enum: ["videos", "chapters", "topics", "problems", "hours"],
      default: "videos",
    },
    isConfigured: {
      type: Boolean,
      default: false,
    },
    dailyStudyHours: {
      type: Number,
      default: 10,
      min: 1,
      max: 20,
    },
    studyDaysPerWeek: {
      type: Number,
      default: 6,
      min: 1,
      max: 7,
    },
    restDayOfWeek: {
      type: Number,
      default: 0, // 0 = Sunday
    },
    phase1Deadline: {
      type: Date,
      default: () => new Date("2026-12-31T23:59:59.999Z"),
    },
    pyqStartDate: {
      type: Date,
      default: () => new Date("2027-01-01T00:00:00.000Z"),
    },
    gateExamDate: {
      type: Date,
      default: () => new Date("2027-02-06T09:00:00.000Z"),
    },
    currentPhase: {
      type: String,
      enum: ["Phase 1 - Lectures & Concept", "Phase 2 - PYQ Practice"],
      default: "Phase 1 - Lectures & Concept",
    },
    playbackSpeed: {
      type: Number,
      default: 1.0,
      min: 0.5,
      max: 3.0,
    },
    revisionHoursDaily: {
      type: Number,
      default: 1.0,
      min: 0,
      max: 4,
    },
  },
  {
    timestamps: true,
  }
);

export const GateUserSettings: Model<IGateUserSettings> =
  mongoose.models.GateUserSettings ||
  mongoose.model<IGateUserSettings>("GateUserSettings", GateUserSettingsSchema);
