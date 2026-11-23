import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGatePYQProgress extends Document {
  userId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  topic: string;
  year?: number;
  questionsAttempted: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracyPercentage: number;
  timeTakenMinutes: number;
  difficulty: "Easy" | "Medium" | "Hard";
  revisionStatus: "Needs Revision" | "Mastered" | "Pending Review";
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GatePYQProgressSchema = new Schema<IGatePYQProgress>(
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
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
    },
    questionsAttempted: {
      type: Number,
      required: true,
      min: 1,
    },
    correctAnswers: {
      type: Number,
      required: true,
      min: 0,
    },
    incorrectAnswers: {
      type: Number,
      required: true,
      min: 0,
    },
    accuracyPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    timeTakenMinutes: {
      type: Number,
      default: 30,
      min: 1,
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    revisionStatus: {
      type: String,
      enum: ["Needs Revision", "Mastered", "Pending Review"],
      default: "Pending Review",
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
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

GatePYQProgressSchema.index({ userId: 1, subjectId: 1 });

export const GatePYQProgress: Model<IGatePYQProgress> =
  mongoose.models.GatePYQProgress ||
  mongoose.model<IGatePYQProgress>("GatePYQProgress", GatePYQProgressSchema);
