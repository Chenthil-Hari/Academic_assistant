import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  entityType: string;
  entityId: string;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  timestamp: Date;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
    },
    entityId: {
      type: String,
      required: true,
      trim: true,
    },
    previousData: {
      type: Schema.Types.Mixed,
    },
    newData: {
      type: Schema.Types.Mixed,
    },
    reason: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditLogSchema.index({ userId: 1, timestamp: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
export default AuditLog;
