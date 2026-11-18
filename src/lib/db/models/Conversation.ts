import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface IConversation extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system", "tool"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "Academic Conversation",
      trim: true,
    },
    messages: [MessageSchema],
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ userId: 1, updatedAt: -1 });

export const Conversation: Model<IConversation> =
  mongoose.models.Conversation || mongoose.model<IConversation>("Conversation", ConversationSchema);
export default Conversation;
