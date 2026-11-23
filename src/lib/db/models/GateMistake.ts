import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGateMistake extends Document {
  userId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  topic: string;
  questionDetails: string;
  myMistake: string;
  correctConcept: string;
  gateYear?: string;
  isReviewed: boolean;
  reviewedAt?: Date;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const GateMistakeSchema = new Schema<IGateMistake>(
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
    questionDetails: {
      type: String,
      required: true,
      trim: true,
    },
    myMistake: {
      type: String,
      required: true,
      trim: true,
    },
    correctConcept: {
      type: String,
      required: true,
      trim: true,
    },
    gateYear: {
      type: String,
      default: "",
    },
    isReviewed: {
      type: Boolean,
      default: false,
      index: true,
    },
    reviewedAt: {
      type: Date,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const GateMistake: Model<IGateMistake> =
  mongoose.models.GateMistake || mongoose.model<IGateMistake>("GateMistake", GateMistakeSchema);
