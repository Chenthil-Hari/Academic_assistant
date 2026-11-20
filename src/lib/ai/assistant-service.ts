import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import connectToDatabase from "@/lib/db/connection";
import { Conversation, IConversation } from "@/lib/db/models/Conversation";
import { User } from "@/lib/db/models/User";
import { AI_TOOLS_DEFINITIONS, executeAiTool } from "./tools";
import mongoose from "mongoose";

export interface ChatResponse {
  conversationId: string;
  response: string;
  toolCallsMade?: string[];
}

export async function processUserMessage(params: {
  userId: string;
  conversationId?: string;
  message: string;
}): Promise<ChatResponse> {
  await connectToDatabase();
  const { userId, message } = params;
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const userDoc = await User.findById(userObjectId);
  const studentName = userDoc?.name || "Hari";

  // 1. Fetch or create Conversation in MongoDB
  let conversation: IConversation | null = null;
  if (params.conversationId) {
    conversation = await Conversation.findOne({
      _id: params.conversationId,
      userId: userObjectId,
    });
  }

  if (!conversation) {
    conversation = await Conversation.create({
      userId: userObjectId,
      title: message.slice(0, 35) + (message.length > 35 ? "..." : ""),
      messages: [],
    });
  }

  // Append user's message
  conversation.messages.push({
    role: "user",
    content: message,
    timestamp: new Date(),
  });

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const isGemini = Boolean(geminiKey && geminiKey !== "your_gemini_api_key_here");
  const apiKey = isGemini ? geminiKey : openaiKey;
  const baseURL = isGemini ? "https://generativelanguage.googleapis.com/v1beta/openai/" : undefined;
  const modelName = isGemini
    ? process.env.GEMINI_MODEL || "gemini-flash-lite-latest"
    : process.env.OPENAI_MODEL || "gpt-4o-mini";

  let assistantReply = "";
  const toolCallsMade: string[] = [];

  // Check if AI provider API key is set
  if (apiKey && apiKey !== "your_openai_api_key_here") {
    try {
      const client = new OpenAI({
        apiKey,
        baseURL,
        timeout: 15000,
        maxRetries: 1,
      });

      // Build context messages from history (last 10 turns)
      const systemPrompt = `
You are the personal AI Academic Management Assistant built exclusively for ${studentName}.
You serve as their private, dedicated student advisor, study planner, and attendance operating system.
You know ${studentName}'s enrolled subjects, timetable schedule, bunk thresholds, exams, and calendar events.

CRITICAL RULES:
1. Always call the appropriate tool to fetch verified, authenticated data from ${studentName}'s MongoDB records.
2. CONCISENESS & ACCURACY: Keep all answers short, punchy, and direct (1 to 2 sentences maximum). Do not use conversational filler. State the exact date, subject, or attendance figure immediately.
   Example: "Pongal holiday starts on **January 14, 2027** and ends on **January 18, 2027**."
3. NEVER fabricate, estimate, or hallucinate attendance numbers, subject codes, or dates.
4. When answering questions about attendance, cite exact figures: Conducted, Attended, Absent, and Percentage.
5. If ${studentName} asks "Can I miss a class?" or "How many classes must I attend?", call calculate_bunk_and_targets.
6. If ${studentName} asks about their uploaded timetable or calendar PDF, document contents, or what was extracted from their files, call get_uploaded_document_details to inspect the uploaded records and answer accurately.
7. If asked "what is the class now", "current class", or "what class do I have now", call get_today_schedule. If there is an active running class, state: "Right now at <Time>, you have **<Subject>** in **<Room>**." If no class is running right now, state when the next class starts, or that classes for today are complete.
8. Format key items in **bold**.
`;

      const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
      ];

      const recentHistory = conversation.messages.slice(-8);
      for (const m of recentHistory) {
        if (m.role === "user" || m.role === "assistant") {
          chatMessages.push({
            role: m.role,
            content: m.content,
          });
        }
      }

      // Initial call with tools
      const firstResponse = await client.chat.completions.create({
        model: modelName,
        messages: chatMessages,
        tools: AI_TOOLS_DEFINITIONS,
        tool_choice: "auto",
        temperature: 0.2,
      });

      const responseMessage = firstResponse.choices[0]?.message;

      // Handle tool calls if any
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        chatMessages.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls) {
          toolCallsMade.push(toolCall.function.name);
          let toolArgs = {};
          try {
            toolArgs = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            toolArgs = {};
          }

          const toolResult = await executeAiTool(toolCall.function.name, toolArgs, userId);

          chatMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        }

        // Get final synthesized answer
        const secondResponse = await client.chat.completions.create({
          model: modelName,
          messages: chatMessages,
          temperature: 0.2,
        });

        assistantReply = secondResponse.choices[0]?.message?.content || "I have retrieved your academic data.";
      } else {
        assistantReply = responseMessage.content || "How can I assist you with your academics today?";
      }
    } catch (openaiErr) {
      console.warn("OpenAI API call failed, using deterministic grounded fallback:", openaiErr);
      assistantReply = await runGroundedFallback(message, userId, toolCallsMade, studentName);
    }
  } else {
    // Deterministic grounded response handler
    assistantReply = await runGroundedFallback(message, userId, toolCallsMade, studentName);
  }

  // Append assistant message to persistent conversation
  conversation.messages.push({
    role: "assistant",
    content: assistantReply,
    timestamp: new Date(),
    metadata: { toolCallsMade },
  });

  await conversation.save();

  return {
    conversationId: conversation._id.toString(),
    response: assistantReply,
    toolCallsMade,
  };
}

/**
 * Deterministic intent-to-tool dispatcher when OpenAI is in fallback mode
 */
async function runGroundedFallback(
  message: string,
  userId: string,
  toolCalls: string[],
  studentName: string = "Hari"
): Promise<string> {
  const lower = message.toLowerCase();

  if (lower.includes("pdf") || lower.includes("uploaded") || lower.includes("document") || lower.includes("upload")) {
    toolCalls.push("get_uploaded_document_details");
    const data = await executeAiTool("get_uploaded_document_details", {}, userId);
    if (!data.documents || data.documents.length === 0) {
      return "📄 **Uploaded Documents**: You have not uploaded any timetable or calendar PDFs yet. Go to the **PDF Upload** page to upload your schedule or calendar!";
    }
    const docsSummary = data.documents
      .map((d: any, idx: number) => {
        const subjectsStr = d.detectedSubjects?.map((s: any) => `\`${s.code}\` (${s.name})`).join(", ") || "None";
        return `### ${idx + 1}. 📄 **${d.fileName}**
• **Type**: ${d.fileType === "timetable_pdf" ? "Weekly Timetable" : "Academic Calendar"}
• **Uploaded**: ${new Date(d.uploadedAt).toLocaleDateString()}
• **Status**: ${d.isVerified ? "✅ Verified & Active in System" : "⏳ Pending Verification on Upload Page"}
• **Detected Subjects**: ${subjectsStr}
• **Timetable Slots**: ${d.timetableSlotsCount} classes mapped
• **Document Text Preview**:
> *${d.rawTextSample ? d.rawTextSample.slice(0, 250).replace(/\s+/g, " ") : "No text available"}...*`;
      })
      .join("\n\n");

    return `📑 **Your Uploaded Academic Documents (${data.count})**\n\n${docsSummary}\n\n💡 *Ask me any questions about your timetable, classes today, or bunk buffers and I'll link it to your academic records!*`;
  }

  if (lower.includes("today") || lower.includes("class today") || lower.includes("schedule today")) {
    toolCalls.push("get_today_schedule");
    const data = await executeAiTool("get_today_schedule", {}, userId);
    if (data.isHoliday) {
      return `🎉 **Today is a Holiday!**\n\n${data.message}`;
    }
    if (!data.classes || data.classes.length === 0) {
      return `📅 **Schedule for ${data.day} (${data.date})**\n\nYou have no classes scheduled for today! Enjoy your day off or use it for study prep.`;
    }
    const list = data.classes
      .map(
        (c: any, i: number) =>
          `${i + 1}. **${c.subjectCode}** (${c.subjectName})\n   • Time: \`${c.time}\`\n   • Room: \`${c.room}\`\n   • Type: *${c.type}*`
      )
      .join("\n\n");
    return `📅 **Your Classes Today (${data.day}, ${data.date})**\n\nYou have **${data.totalClasses}** class(es) scheduled:\n\n${list}`;
  }

  if (lower.includes("lowest") && lower.includes("attendance")) {
    toolCalls.push("get_lowest_attendance_subject");
    const data = await executeAiTool("get_lowest_attendance_subject", {}, userId);
    if (!data.lowestAttendanceSubject) {
      return data.message || "No attendance data recorded yet.";
    }
    const sub = data.lowestAttendanceSubject;
    return `⚠️ **Lowest Attendance Subject**\n\n• **${sub.code}** (${sub.name})\n• Current Attendance: **${sub.percentage}%**\n• Attended: **${sub.attended} / ${sub.conducted}** conducted classes\n\n${data.warning}`;
  }

  if (
    lower.includes("pongal") ||
    lower.includes("diwali") ||
    lower.includes("deepavali") ||
    lower.includes("exam") ||
    lower.includes("assignment") ||
    lower.includes("calendar") ||
    lower.includes("holiday") ||
    lower.includes("vacation")
  ) {
    let searchTerm: string | undefined = undefined;
    if (lower.includes("pongal")) searchTerm = "Pongal";
    else if (lower.includes("diwali") || lower.includes("deepavali")) searchTerm = "Diwali";
    else if (lower.includes("christmas")) searchTerm = "Christmas";
    else if (lower.includes("midterm") || lower.includes("mid sem")) searchTerm = "Midterm";
    else if (lower.includes("end sem") || lower.includes("final exam")) searchTerm = "End";

    toolCalls.push("get_upcoming_academic_events");
    const data = await executeAiTool(
      "get_upcoming_academic_events",
      { searchTerm, daysAhead: 180 },
      userId
    );

    if (!data.events || data.events.length === 0) {
      if (searchTerm) {
        return `No scheduled event found for **"${searchTerm}"** in your academic calendar.`;
      }
      return "No upcoming exams or holidays found in your academic calendar.";
    }

    // Direct, short answer for specific holiday/event queries like Pongal
    if (searchTerm && data.events.length > 0) {
      const ev = data.events[0];
      const endStr = ev.endDate ? ` and ends on **${ev.endDate}**` : "";
      return `🎉 **${ev.title}** starts on **${ev.date}**${endStr}.`;
    }

    const list = data.events
      .slice(0, 5)
      .map(
        (e: any) =>
          `• **${e.date}**: **${e.title}** [${e.type}]${e.isHoliday ? " 🏖️ Holiday" : ""}`
      )
      .join("\n");
    return `📌 **Academic Events & Holidays:**\n\n${list}`;
  }

  if (lower.includes("miss") || lower.includes("bunk") || lower.includes("reach") || lower.includes("%")) {
    toolCalls.push("calculate_bunk_and_targets");
    // Check if a specific subject was asked
    const subMatch = message.match(/(?:in|for|of)\s+([A-Za-z0-9_-]+)/i);
    const subNameOrCode = subMatch ? subMatch[1] : undefined;
    const data = await executeAiTool("calculate_bunk_and_targets", { subjectNameOrCode: subNameOrCode }, userId);

    if (data.error) {
      return `❌ ${data.error}`;
    }

    const title = data.subjectCode ? `${data.subjectCode} (${data.subjectName})` : "Overall Cumulative Attendance";
    return `📊 **Attendance Bunk & Target Analysis for ${title}**\n\n• Current Attendance: **${data.currentPercentage}%**\n• Target Required: **${data.targetPercentage}%**\n• Conducted Classes: **${data.conducted || data.totalConducted}**\n• Attended Classes: **${data.attended || data.totalAttended}**\n\n💡 **Verdict:**\n${data.verdict}`;
  }

  if (lower.includes("week") || lower.includes("timetable")) {
    toolCalls.push("get_weekly_timetable");
    const data = await executeAiTool("get_weekly_timetable", {}, userId);
    let out = "🗓️ **Your Weekly Timetable Overview**\n\n";
    for (const [day, list] of Object.entries(data.schedule as Record<string, any[]>)) {
      out += `**${day}:**\n`;
      if (list.length === 0) {
        out += "  *No classes*\n";
      } else {
        out += list.map((c) => `  • \`${c.time}\`: **${c.subjectCode}** (${c.room})`).join("\n") + "\n";
      }
      out += "\n";
    }
    return out;
  }

  // General Attendance overview
  toolCalls.push("get_subject_attendance");
  const data = await executeAiTool("get_subject_attendance", {}, userId);
  if (data.overall) {
    const list = data.subjects
      .map(
        (s: any) =>
          `• **${s.subjectCode}**: **${s.percentage}%** (${s.attended}/${s.conducted} classes) [${s.status}]`
      )
      .join("\n");
    return `📊 **Your Academic Attendance Summary**\n\n• **Overall Attendance:** **${data.overall.overallPercentage}%**\n• Target Threshold: **${data.overall.targetPercentage}%**\n• Status: **${data.overall.status}**\n\n**Subject Breakdown:**\n${list}\n\n*Ask me "Can I miss a class in DBMS?" or "What classes do I have today?" for specific details!*`;
  }

  return `👋 Hi ${studentName}! I am your personal Academic AI Assistant. Ask me about your timetable today, subject attendance, bunk calculator, or upcoming exams!`;
}
