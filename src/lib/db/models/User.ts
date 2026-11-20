import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  college?: string;
  branch?: string;
  semester?: number;
  rollNumber?: string;
  targetAttendancePercentage: number;
  notificationPreferences: {
    webPush: boolean;
    telegram: boolean;
    dailyCheckinTime: string; // e.g. "16:00"
    timezone: string; // e.g. "Asia/Kolkata"
  };
  webPushSubscription?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  telegramChatId?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
    },
    college: {
      type: String,
      default: "",
      trim: true,
    },
    branch: {
      type: String,
      default: "",
      trim: true,
    },
    semester: {
      type: Number,
      default: 1,
      min: 1,
      max: 12,
    },
    rollNumber: {
      type: String,
      default: "",
      trim: true,
    },
    targetAttendancePercentage: {
      type: Number,
      default: 75,
      min: 1,
      max: 100,
    },
    notificationPreferences: {
      webPush: { type: Boolean, default: true },
      telegram: { type: Boolean, default: false },
      dailyCheckinTime: { type: String, default: "16:00" },
      timezone: { type: String, default: "Asia/Kolkata" },
    },
    webPushSubscription: {
      endpoint: String,
      keys: {
        p256dh: String,
        auth: String,
      },
    },
    telegramChatId: {
      type: String,
      default: "",
    },
    resetPasswordToken: {
      type: String,
      index: true,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model overwrite in hot reload / Next.js serverless
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
