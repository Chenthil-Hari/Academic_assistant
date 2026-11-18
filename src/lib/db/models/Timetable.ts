import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITimetable extends Document {
  userId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  timeSlot: {
    startTime: string; // e.g. "09:00"
    endTime: string;   // e.g. "10:00"
  };
  room: string;
  type: "Lecture" | "Lab" | "Tutorial" | "Seminar";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TimetableSchema = new Schema<ITimetable>(
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
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    timeSlot: {
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
    },
    room: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      enum: ["Lecture", "Lab", "Tutorial", "Seminar"],
      default: "Lecture",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

TimetableSchema.index({ userId: 1, dayOfWeek: 1, "timeSlot.startTime": 1 });

export const Timetable: Model<ITimetable> =
  mongoose.models.Timetable || mongoose.model<ITimetable>("Timetable", TimetableSchema);
export default Timetable;
