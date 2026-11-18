import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubject extends Document {
  userId: mongoose.Types.ObjectId;
  code: string;
  name: string;
  credit: number;
  faculty: string;
  color: string;
  minAttendanceThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: [true, "Subject code is required"],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },
    credit: {
      type: Number,
      default: 3,
      min: 0,
      max: 10,
    },
    faculty: {
      type: String,
      default: "",
      trim: true,
    },
    color: {
      type: String,
      default: "#3B82F6", // Tailwind blue-500
    },
    minAttendanceThreshold: {
      type: Number,
      default: 75,
      min: 1,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique subject code per user
SubjectSchema.index({ userId: 1, code: 1 }, { unique: true });

export const Subject: Model<ISubject> =
  mongoose.models.Subject || mongoose.model<ISubject>("Subject", SubjectSchema);
export default Subject;
