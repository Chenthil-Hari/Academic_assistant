import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGateStudySession extends Document {
  userId: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  date: Date; // Normalized to YYYY-MM-DD
  dayName: string; // e.g. "Monday"
  timeSlot: string; // e.g. "08:00 - 10:30"
  plannedHours: number;
  actualHours: number;
  plannedVideos: number;
  actualVideos: number;
  sessionType: "Lecture" | "Revision" | "Buffer" | "PYQ Practice";
  status: "Scheduled" | "Completed" | "Missed" | "Rescheduled";
  topicsCovered: string;
  notes?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GateStudySessionSchema = new Schema<IGateStudySession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "GateSubject",
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    dayName: {
      type: String,
      default: "",
    },
    timeSlot: {
      type: String,
      default: "",
    },
    plannedHours: {
      type: Number,
      required: true,
      min: 0,
    },
    actualHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    plannedVideos: {
      type: Number,
      default: 0,
    },
    actualVideos: {
      type: Number,
      default: 0,
    },
    sessionType: {
      type: String,
      enum: ["Lecture", "Revision", "Buffer", "PYQ Practice"],
      default: "Lecture",
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Missed", "Rescheduled"],
      default: "Scheduled",
      index: true,
    },
    topicsCovered: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

GateStudySessionSchema.index({ userId: 1, date: 1 });

export const GateStudySession: Model<IGateStudySession> =
  mongoose.models.GateStudySession ||
  mongoose.model<IGateStudySession>("GateStudySession", GateStudySessionSchema);
