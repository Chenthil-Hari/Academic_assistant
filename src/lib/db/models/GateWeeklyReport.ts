import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGateWeeklyReport extends Document {
  userId: mongoose.Types.ObjectId;
  weekStartDate: Date;
  weekEndDate: Date;
  totalPlannedHours: number;
  totalActualHours: number;
  totalVideosCompleted: number;
  adherencePercentage: number;
  summary: string;
  weakSubjects: string[];
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

const GateWeeklyReportSchema = new Schema<IGateWeeklyReport>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    weekStartDate: {
      type: Date,
      required: true,
    },
    weekEndDate: {
      type: Date,
      required: true,
    },
    totalPlannedHours: {
      type: Number,
      required: true,
      default: 0,
    },
    totalActualHours: {
      type: Number,
      required: true,
      default: 0,
    },
    totalVideosCompleted: {
      type: Number,
      default: 0,
    },
    adherencePercentage: {
      type: Number,
      default: 0,
    },
    summary: {
      type: String,
      default: "",
    },
    weakSubjects: {
      type: [String],
      default: [],
    },
    recommendations: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

GateWeeklyReportSchema.index({ userId: 1, weekStartDate: -1 });

export const GateWeeklyReport: Model<IGateWeeklyReport> =
  mongoose.models.GateWeeklyReport ||
  mongoose.model<IGateWeeklyReport>("GateWeeklyReport", GateWeeklyReportSchema);
