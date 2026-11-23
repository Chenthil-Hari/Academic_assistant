import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGateSubject extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  initialVideos: number;
  remainingVideos: number;
  completedVideos: number;
  averageVideoDuration: number; // in hours, e.g. 1.5, 2.0
  priority: "High" | "Medium" | "Low";
  priorityOrder: number; // 1 to 14
  color: string;
  status: "Not Started" | "In Progress" | "Completed";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GateSubjectSchema = new Schema<IGateSubject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Subject code is required"],
      trim: true,
      uppercase: true,
    },
    initialVideos: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    remainingVideos: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    completedVideos: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    averageVideoDuration: {
      type: Number,
      required: true,
      min: 0.1,
      default: 1.5,
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "High",
      index: true,
    },
    priorityOrder: {
      type: Number,
      default: 99,
      index: true,
    },
    color: {
      type: String,
      default: "#3B82F6",
    },
    status: {
      type: String,
      enum: ["Not Started", "In Progress", "Completed"],
      default: "In Progress",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user + subject code
GateSubjectSchema.index({ userId: 1, code: 1 });

export const GateSubject: Model<IGateSubject> =
  mongoose.models.GateSubject || mongoose.model<IGateSubject>("GateSubject", GateSubjectSchema);
