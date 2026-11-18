import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUploadedDocument extends Document {
  userId: mongoose.Types.ObjectId;
  fileName: string;
  fileUrl: string; // local private storage path or data reference
  fileType: "timetable_pdf" | "academic_calendar_pdf" | "syllabus_pdf" | "other";
  fileSize: number;
  extractionStatus: "pending" | "processing" | "completed" | "failed";
  extractedData?: {
    subjects?: Array<{
      code: string;
      name: string;
      credit?: number;
      faculty?: string;
    }>;
    timetableSlots?: Array<{
      subjectCode: string;
      subjectName: string;
      dayOfWeek: number;
      dayName: string;
      startTime: string;
      endTime: string;
      room?: string;
      type?: "Lecture" | "Lab" | "Tutorial" | "Seminar";
    }>;
    calendarEvents?: Array<{
      title: string;
      type: "Exam" | "Assignment" | "Holiday" | "Event" | "SemesterStart" | "SemesterEnd";
      date: string; // YYYY-MM-DD
      endDate?: string;
      description?: string;
      isHoliday?: boolean;
    }>;
    semesterDates?: {
      startDate?: string;
      endDate?: string;
    };
  };
  rawText?: string;
  isVerifiedByUser: boolean;
  errorMessage?: string;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UploadedDocumentSchema = new Schema<IUploadedDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ["timetable_pdf", "academic_calendar_pdf", "syllabus_pdf", "other"],
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    extractionStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    extractedData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    rawText: {
      type: String,
      default: "",
    },
    isVerifiedByUser: {
      type: Boolean,
      default: false,
    },
    errorMessage: {
      type: String,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const UploadedDocument: Model<IUploadedDocument> =
  mongoose.models.UploadedDocument ||
  mongoose.model<IUploadedDocument>("UploadedDocument", UploadedDocumentSchema);
export default UploadedDocument;
