import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessMenu extends Document {
  userId: mongoose.Types.ObjectId;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  breakfast: string[];
  lunch: string[];
  snacks: string[];
  dinner: string[];
  timings: {
    breakfast: string;
    lunch: string;
    snacks: string;
    dinner: string;
  };
  specialNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessMenuSchema = new Schema<IMessMenu>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    breakfast: { type: [String], default: [] },
    lunch: { type: [String], default: [] },
    snacks: { type: [String], default: [] },
    dinner: { type: [String], default: [] },
    timings: {
      breakfast: { type: String, default: "07:30 - 09:30 AM" },
      lunch: { type: String, default: "12:30 - 02:30 PM" },
      snacks: { type: String, default: "04:30 - 05:45 PM" },
      dinner: { type: String, default: "07:30 - 09:30 PM" },
    },
    specialNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

// Compound index to ensure 1 unique menu entry per user per day of week
MessMenuSchema.index({ userId: 1, dayOfWeek: 1 }, { unique: true });

export const MessMenu: Model<IMessMenu> =
  mongoose.models.MessMenu || mongoose.model<IMessMenu>("MessMenu", MessMenuSchema);
