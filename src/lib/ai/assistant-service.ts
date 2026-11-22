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
You serve as their private, dedicated student advisor, study planner, and attendance operating system across both the website and Telegram.
You have complete access to ${studentName}'s personal student profile, enrolled subjects, timetable schedules, attendance records, bunk targets, exams, and calendar events.

CRITICAL RULES:
1. Always call the appropriate tool to fetch verified, authenticated live data from ${studentName}'s MongoDB records.
2. PERSONAL PROFILE & IDENTITY:
   - When asked about ${studentName}'s identity, roll number, college/university, department/branch, semester, email, target attendance %, or notification preferences (Telegram / Web Push), call get_user_profile.
3. COMPLETE DETAILS & ACADEMIC OVERVIEW:
   - When asked "tell me all my details and information", "show everything about me from the website", "who am I and what's my status?", or broad overview questions, call get_academic_dashboard_overview to give a complete, well-organized breakdown covering:
     • Student Profile & Credentials
     • Enrolled Subjects & Total Credits
     • Overall Attendance Status & Target Threshold
     • Schedule & Upcoming Events
4. ENROLLED SUBJECTS & CREDITS:
   - When asked about enrolled subjects, course codes, course credits, faculty, or teachers, call get_enrolled_subjects.
5. TIMETABLE & CLASSES:
   - For schedule today, current active class, or next class, call get_today_schedule. If there is an active running class, state: "Right now at <Time>, you have **<Subject>** in **<Room>**."
   - For tomorrow, yesterday, or a specific day of the week (e.g. "what classes do I have on Friday?", "schedule tomorrow"), call get_schedule_for_day with dayOrDate.
   - For the full weekly schedule (Monday - Saturday), call get_weekly_timetable.
6. ATTENDANCE & BUNKS:
   - For current subject-by-subject attendance percentages, call get_subject_attendance.
   - If ${studentName} asks "Can I miss/bunk a class?", "How many classes can I bunk?", or "How many classes must I attend?", call calculate_bunk_and_targets.
   - If asked about end-of-semester attendance projections or maximum achievable %, call predict_semester_attendance.
   - If asked about attendance on a specific date (e.g. yesterday, last week) or recent attendance records, call get_attendance_history_or_records.
7. ACADEMIC CALENDAR & HOLIDAYS:
   - When asked about holidays (e.g. Pongal, Diwali, Christmas), exams, or assignment deadlines, call get_upcoming_academic_events.
8. UPLOADED DOCUMENTS & PDFS:
   - If asked about uploaded timetable or calendar PDFs or extracted schedules, call get_uploaded_document_details.
9. ACCURACY & FORMATTING:
   - NEVER fabricate, estimate, or hallucinate attendance numbers, subject codes, roll numbers, or dates.
   - Cite exact numbers: Conducted, Attended, Absent, and Percentage.
   - Format key entities in **bold**.
   - For specific targeted questions (e.g. "What is my roll number?"), answer directly with the exact verified data.
   - For comprehensive questions ("all my details"), provide a structured, complete response covering all relevant website information.
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

  // 1. Comprehensive Academic Overview / All Details from the Website
  if (
    (lower.includes("all") && (lower.includes("detail") || lower.includes("information") || lower.includes("info"))) ||
    lower.includes("everything") ||
    lower.includes("overview") ||
    lower.includes("dashboard")
  ) {
    toolCalls.push("get_academic_dashboard_overview");
    const data = await executeAiTool("get_academic_dashboard_overview", {}, userId);
    const p = data.profile || {};
    const a = data.attendance || {};
    const subs = a.subjectBreakdown || [];

    const subjectRows = subs
      .map(
        (s: any) =>
          `• **${s.code}** (${s.name}): **${s.percentage}%** (${s.attended}/${s.conducted} classes) [${s.status}]`
      )
      .join("\n");

    const todayClasses = (data.todaySchedule?.classes || [])
      .map((c: any) => `• \`${c.time}\`: **${c.code}** (${c.name}) in Room **${c.room}**`)
      .join("\n") || "No classes scheduled for today.";

    return `🎓 **Comprehensive Academic Profile & Website Details for ${p.name || studentName}**

👤 **Personal & Student Information:**
• **Full Name:** ${p.name || "N/A"}
• **Roll Number:** \`${p.rollNumber || "CH.SC.U4CSE4103"}\`
• **College:** ${p.college || "Amrita Vishwa Vidhyapeetham"}
• **Department / Branch:** ${p.branch || "Computer Science"}
• **Semester:** Semester ${p.semester || 6}
• **Registered Email:** \`${p.email || "N/A"}\`
• **Target Attendance Threshold:** **${p.targetAttendance || 75}%**
• **Telegram Assistant Connected:** ${p.telegramConnected ? "✅ Yes (Live)" : "❌ Not linked"}

📊 **Current Attendance Summary:**
• **Overall Attendance:** **${a.overallPercentage || 0}%** (${a.totalAttended || 0}/${a.totalConducted || 0} classes)
• **Target:** **${a.targetPercentage || 75}%**
• **Status:** **${a.status || "Safe"}**
• **Enrolled Courses:** **${data.enrolment?.totalSubjects || subs.length}** subjects (${data.enrolment?.totalCredits || 0} credits)

📚 **Subject Breakdown:**
${subjectRows || "No subject attendance data available."}

📅 **Today's Schedule:**
${todayClasses}

${data.nextEvent ? `📌 **Next Academic Event:** **${data.nextEvent.title}** on **${data.nextEvent.date}**${data.nextEvent.isHoliday ? " (🏖️ Holiday)" : ""}` : ""}

💡 *You can ask me specific questions like "Can I bunk Distributed Systems?", "What classes do I have tomorrow?", or "When is Pongal holiday?" anytime!*`;
  }

  // 2. Personal Profile / Identity queries
  if (
    lower.includes("who am i") ||
    lower.includes("my roll") ||
    lower.includes("roll number") ||
    lower.includes("my college") ||
    lower.includes("my branch") ||
    lower.includes("my department") ||
    lower.includes("my semester") ||
    lower.includes("my email") ||
    lower.includes("my setting") ||
    lower.includes("about me") ||
    lower.includes("my profile") ||
    lower.includes("my info")
  ) {
    toolCalls.push("get_user_profile");
    const p = await executeAiTool("get_user_profile", {}, userId);
    if (p.error) return `❌ ${p.error}`;

    return `👤 **Student Profile & Account Details**

• **Name:** **${p.name}**
• **Roll Number:** \`${p.rollNumber}\`
• **College:** **${p.college}**
• **Department:** **${p.branch}**
• **Current Semester:** **Semester ${p.semester}**
• **Email:** \`${p.email}\`
• **Target Attendance:** **${p.targetAttendancePercentage}%**
• **Telegram Connected:** ${p.telegramConnected ? `✅ Yes (Chat ID: \`${p.telegramChatId}\`)` : "❌ Not connected"}
• **Daily Check-in Time:** \`${p.notificationPreferences?.dailyCheckinTime || "16:00"}\` (${p.notificationPreferences?.timezone || "Asia/Kolkata"})
• **Joined Academic AI:** ${p.accountCreatedAt || "Recently"}`;
  }

  // 3. Enrolled Subjects & Courses
  if (
    lower.includes("enrolled subject") ||
    lower.includes("my subject") ||
    lower.includes("all subject") ||
    lower.includes("courses") ||
    lower.includes("faculty") ||
    lower.includes("professor") ||
    lower.includes("credits")
  ) {
    toolCalls.push("get_enrolled_subjects");
    const data = await executeAiTool("get_enrolled_subjects", {}, userId);
    if (!data.subjects || data.subjects.length === 0) {
      return "📚 You have not registered any subjects yet. You can add subjects or upload your timetable PDF on the website!";
    }

    const list = data.subjects
      .map(
        (s: any, idx: number) =>
          `${idx + 1}. **${s.code}** — **${s.name}**\n   • Credits: **${s.credit}** | Min Attendance Target: **${s.minAttendanceThreshold}%**${s.faculty && s.faculty !== "Not assigned" ? ` | Faculty: *${s.faculty}*` : ""}`
      )
      .join("\n\n");

    return `📚 **Your Registered Subjects (${data.totalSubjects} subjects, ${data.totalCredits} total credits):**\n\n${list}`;
  }

  // 4. Specific Day / Tomorrow / Yesterday Schedule
  if (
    lower.includes("tomorrow") ||
    lower.includes("yesterday") ||
    lower.includes("monday") ||
    lower.includes("tuesday") ||
    lower.includes("wednesday") ||
    lower.includes("thursday") ||
    lower.includes("friday") ||
    lower.includes("saturday") ||
    lower.includes("sunday")
  ) {
    let dayTarget = "today";
    if (lower.includes("tomorrow")) dayTarget = "tomorrow";
    else if (lower.includes("yesterday")) dayTarget = "yesterday";
    else {
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      for (const d of days) {
        if (lower.includes(d)) {
          dayTarget = d;
          break;
        }
      }
    }

    toolCalls.push("get_schedule_for_day");
    const data = await executeAiTool("get_schedule_for_day", { dayOrDate: dayTarget }, userId);

    if (data.isHoliday) {
      return `🎉 **${data.day} (${data.date}) is a Holiday!**\n\n${data.message}`;
    }

    if (!data.classes || data.classes.length === 0) {
      return `📅 **Schedule for ${data.day} (${data.date})**\n\nYou have no classes scheduled for ${data.day}! Enjoy your day off.`;
    }

    const list = data.classes
      .map(
        (c: any, i: number) =>
          `${i + 1}. **${c.subjectCode}** (${c.subjectName})\n   • Time: \`${c.time}\`\n   • Room: \`${c.room}\`\n   • Type: *${c.type}*`
      )
      .join("\n\n");

    return `📅 **Classes for ${data.day} (${data.date})**\n\nYou have **${data.totalClasses}** class(es) scheduled:\n\n${list}`;
  }

  // 5. Attendance History / Past Records / Recent Check-in
  if (
    lower.includes("history") ||
    lower.includes("recent attendance") ||
    lower.includes("was i absent") ||
    lower.includes("was i present") ||
    lower.includes("attendance record") ||
    lower.includes("attendance log")
  ) {
    toolCalls.push("get_attendance_history_or_records");
    const dateParam = lower.includes("yesterday") ? "yesterday" : lower.includes("today") ? "today" : undefined;
    const data = await executeAiTool("get_attendance_history_or_records", { date: dateParam, limit: 15 }, userId);

    if (!data.records || data.records.length === 0) {
      return "📋 No recent attendance logs found for this period. Mark your classes on the Attendance page or via Telegram 1-tap check-in!";
    }

    const list = data.records
      .slice(0, 10)
      .map(
        (r: any) =>
          `• **${r.date}**: **${r.subjectCode}** (${r.subjectName}) — **${r.status}** [via ${r.source || "manual"}]`
      )
      .join("\n");

    return `📋 **Attendance Records (${data.count} recent sessions):**\n\n${list}`;
  }

  // 6. 1-Tap Check-in / Daily Check-in via Assistant
  if (
    lower.includes("check in") ||
    lower.includes("checkin") ||
    lower.includes("mark present") ||
    lower.includes("mark attended") ||
    lower.includes("mark all attended")
  ) {
    const action = lower.includes("mark") ? "mark_all_attended" : "get_checkin_status";
    toolCalls.push("mark_attendance_checkin");
    const data = await executeAiTool("mark_attendance_checkin", { action }, userId);

    if (action === "mark_all_attended") {
      return `🎉 **Daily Check-in Complete!**\n\n${data.message || "All classes for today marked as Attended."}`;
    }

    if (data.isHoliday) {
      return `🎉 **Today is a Holiday!** No classes to check in for.`;
    }

    return `⚡ **Daily Check-in Status for Today**\n\n• Classes: **${data.totalClasses}**\n• Status: ${data.allConfirmed ? "✅ All confirmed" : "⏳ Pending confirmation"}\n\nSay *"Mark all attended"* or use the Telegram check-in button to confirm!`;
  }

  // 7. Uploaded Documents
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
• **Timetable Slots**: ${d.timetableSlotsCount} classes mapped`;
      })
      .join("\n\n");

    return `📑 **Your Uploaded Academic Documents (${data.count})**\n\n${docsSummary}\n\n💡 *Ask me any questions about your timetable, classes today, or bunk buffers and I'll link it to your academic records!*`;
  }

  // 8. Schedule Today / Current Class
  if (lower.includes("today") || lower.includes("class today") || lower.includes("schedule today") || lower.includes("class now") || lower.includes("current class")) {
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

    let liveStatus = "";
    if (data.currentClass) {
      liveStatus = `\n\n🔔 **Right Now (${data.currentTimeIST}):** You have **${data.currentClass.code}** (${data.currentClass.name}) in Room **${data.currentClass.room}** (\`${data.currentClass.time}\`).`;
    } else if (data.nextClass) {
      liveStatus = `\n\n⏳ **Next Class:** **${data.nextClass.code}** in Room **${data.nextClass.room}** at \`${data.nextClass.time}\`.`;
    }

    return `📅 **Your Classes Today (${data.day}, ${data.date})**\n\nYou have **${data.totalClasses}** class(es) scheduled:\n\n${list}${liveStatus}`;
  }

  // 9. Lowest Attendance
  if (lower.includes("lowest") && lower.includes("attendance")) {
    toolCalls.push("get_lowest_attendance_subject");
    const data = await executeAiTool("get_lowest_attendance_subject", {}, userId);
    if (!data.lowestAttendanceSubject) {
      return data.message || "No attendance data recorded yet.";
    }
    const sub = data.lowestAttendanceSubject;
    return `⚠️ **Lowest Attendance Subject**\n\n• **${sub.code}** (${sub.name})\n• Current Attendance: **${sub.percentage}%**\n• Attended: **${sub.attended} / ${sub.conducted}** conducted classes\n\n${data.warning}`;
  }

  // 10. Holidays & Exams
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

  // 11. Bunk & Target Calculator
  if (lower.includes("miss") || lower.includes("bunk") || lower.includes("reach") || lower.includes("%")) {
    toolCalls.push("calculate_bunk_and_targets");
    const subMatch = message.match(/(?:in|for|of)\s+([A-Za-z0-9_-]+)/i);
    const subNameOrCode = subMatch ? subMatch[1] : undefined;
    const data = await executeAiTool("calculate_bunk_and_targets", { subjectNameOrCode: subNameOrCode }, userId);

    if (data.error) {
      return `❌ ${data.error}`;
    }

    const title = data.subjectCode ? `${data.subjectCode} (${data.subjectName})` : "Overall Cumulative Attendance";
    return `📊 **Attendance Bunk & Target Analysis for ${title}**\n\n• Current Attendance: **${data.currentPercentage}%**\n• Target Required: **${data.targetPercentage}%**\n• Conducted Classes: **${data.conducted || data.totalConducted}**\n• Attended Classes: **${data.attended || data.totalAttended}**\n\n💡 **Verdict:**\n${data.verdict}`;
  }

  // 12. Weekly Timetable
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

  // 13. General Attendance Overview
  toolCalls.push("get_subject_attendance");
  const data = await executeAiTool("get_subject_attendance", {}, userId);
  if (data.overall) {
    const list = data.subjects
      .map(
        (s: any) =>
          `• **${s.subjectCode}**: **${s.percentage}%** (${s.attended}/${s.conducted} classes) [${s.status}]`
      )
      .join("\n");
    return `📊 **Your Academic Attendance Summary**\n\n• **Overall Attendance:** **${data.overall.overallPercentage}%**\n• Target Threshold: **${data.overall.targetPercentage}%**\n• Status: **${data.overall.status}**\n\n**Subject Breakdown:**\n${list}\n\n*Ask me "Can I miss a class in DBMS?", "What is my schedule tomorrow?", or "Tell me all my details from the website" for specific info!*`;
  }

  return `👋 Hi ${studentName}! I am your personal Academic AI Assistant. Ask me anything about your student profile, roll number, subjects, timetable today or tomorrow, attendance, bunk buffers, or upcoming exams!`;
}
