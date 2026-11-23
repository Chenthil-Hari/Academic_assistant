import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGateProgress extends Document {
  userId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  date: Date;
  videosCompleted: number;
  hoursStudied: number;
  topicsCovered: string;
  notes?: string;
  status: "Completed" | "In Progress";
  createdAt: Date;
  updatedAt: Date;
}

const GateProgressSchema = new Schema<IGateProgress>(
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
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    videosCompleted: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    hoursStudied: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    topicsCovered: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Completed", "In Progress"],
      default: "Completed",
    },
  },
  {
    timestamps: true,
  }
);

GateProgressSchema.index({ userId: 1, date: -1 });

export const GateProgress: Model<IGateProgress> =
  mongoose.models.GateProgress || mongoose.model<IGateProgress>("GateProgress", GateProgressSchema);
