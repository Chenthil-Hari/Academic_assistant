import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: "daily_checkin" | "low_attendance_warning" | "exam_reminder" | "system";
  read: boolean;
  actionUrl: string;
  scheduledFor: Date;
  sentAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["daily_checkin", "low_attendance_warning", "exam_reminder", "system"],
      default: "daily_checkin",
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    actionUrl: {
      type: String,
      default: "/attendance",
    },
    scheduledFor: {
      type: Date,
      default: Date.now,
    },
    sentAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ userId: 1, read: 1, scheduledFor: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
export default Notification;
