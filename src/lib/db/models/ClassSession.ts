import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClassSession extends Document {
  userId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  timetableSlotId?: mongoose.Types.ObjectId;
  date: Date; // normalized to YYYY-MM-DD
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "10:00"
  room: string;
  type: "Lecture" | "Lab" | "Tutorial" | "Seminar" | "ExtraClass";
  status: "Scheduled" | "Conducted" | "Cancelled" | "Rescheduled" | "Holiday";
  notes?: string;
  rescheduledToDate?: Date;
  rescheduledToSlot?: {
    startTime: string;
    endTime: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ClassSessionSchema = new Schema<IClassSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    timetableSlotId: {
      type: Schema.Types.ObjectId,
      ref: "Timetable",
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    room: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      enum: ["Lecture", "Lab", "Tutorial", "Seminar", "ExtraClass"],
      default: "Lecture",
    },
    status: {
      type: String,
      enum: ["Scheduled", "Conducted", "Cancelled", "Rescheduled", "Holiday"],
      default: "Scheduled",
      index: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    rescheduledToDate: {
      type: Date,
    },
    rescheduledToSlot: {
      startTime: String,
      endTime: String,
    },
  },
  {
    timestamps: true,
  }
);

ClassSessionSchema.index({ userId: 1, date: 1, subjectId: 1, startTime: 1 });

export const ClassSession: Model<IClassSession> =
  mongoose.models.ClassSession || mongoose.model<IClassSession>("ClassSession", ClassSessionSchema);
export default ClassSession;
