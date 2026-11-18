import { AuditLog } from "@/lib/db/models/AuditLog";
import mongoose from "mongoose";

export async function createAuditLog(params: {
  userId: string | mongoose.Types.ObjectId;
  action: string;
  entityType: string;
  entityId: string | mongoose.Types.ObjectId;
  previousData?: any;
  newData?: any;
  reason?: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    await AuditLog.create({
      userId: new mongoose.Types.ObjectId(params.userId.toString()),
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId.toString(),
      previousData: params.previousData,
      newData: params.newData,
      reason: params.reason || "",
      ipAddress: params.ipAddress || "",
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    // Non-blocking for core user action, but logged
  }
}
