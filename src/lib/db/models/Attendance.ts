import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttendance extends Document {
  userId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  classSessionId?: mongoose.Types.ObjectId;
  date: Date; // normalized to YYYY-MM-DD
  status: "Attended" | "Absent" | "Cancelled" | "Pending";
  markedAt: Date;
  source: "daily_checkin" | "manual" | "ai_assistant" | "auto_scheduler";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
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
    classSessionId: {
      type: Schema.Types.ObjectId,
      ref: "ClassSession",
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Attended", "Absent", "Cancelled", "Pending"],
      default: "Pending",
      required: true,
      index: true,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      enum: ["daily_checkin", "manual", "ai_assistant", "auto_scheduler"],
      default: "manual",
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent double counting:
// A user cannot have multiple attendance records for the same classSessionId.
// For records without a classSessionId (pure subject/date slot), uniqueness is enforced per user+subject+date.
AttendanceSchema.index(
  { userId: 1, classSessionId: 1 },
  { unique: true, partialFilterExpression: { classSessionId: { $type: "objectId" } } }
);

AttendanceSchema.index({ userId: 1, subjectId: 1, date: 1 });

export const Attendance: Model<IAttendance> =
  mongoose.models.Attendance || mongoose.model<IAttendance>("Attendance", AttendanceSchema);
export default Attendance;
