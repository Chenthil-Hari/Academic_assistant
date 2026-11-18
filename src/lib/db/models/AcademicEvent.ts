import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAcademicEvent extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  type: "Exam" | "Assignment" | "Holiday" | "Event" | "SemesterStart" | "SemesterEnd";
  date: Date;
  endDate?: Date;
  subjectId?: mongoose.Types.ObjectId;
  description?: string;
  isHoliday: boolean;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicEventSchema = new Schema<IAcademicEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["Exam", "Assignment", "Holiday", "Event", "SemesterStart", "SemesterEnd"],
      required: true,
      default: "Event",
    },
    date: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    isHoliday: {
      type: Boolean,
      default: false,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

AcademicEventSchema.index({ userId: 1, date: 1 });

export const AcademicEvent: Model<IAcademicEvent> =
  mongoose.models.AcademicEvent || mongoose.model<IAcademicEvent>("AcademicEvent", AcademicEventSchema);
export default AcademicEvent;
