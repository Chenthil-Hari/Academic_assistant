import OpenAI from "openai";

export interface ParsedSubject {
  code: string;
  name: string;
  credit?: number;
  faculty?: string;
  color?: string;
}

export interface ParsedTimetableSlot {
  subjectCode: string;
  subjectName: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  dayName: string;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "10:00"
  room?: string;
  type?: "Lecture" | "Lab" | "Tutorial" | "Seminar";
}

export interface ParsedCalendarEvent {
  title: string;
  type: "Exam" | "Assignment" | "Holiday" | "Event" | "SemesterStart" | "SemesterEnd";
  date: string; // YYYY-MM-DD
  endDate?: string;
  description?: string;
  isHoliday?: boolean;
}

export interface AcademicExtractionData {
  subjects: ParsedSubject[];
  timetableSlots: ParsedTimetableSlot[];
  calendarEvents: ParsedCalendarEvent[];
  semesterDates?: {
    startDate?: string;
    endDate?: string;
  };
}

const PALETTE = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4", "#EF4444", "#6366F1"];

/**
 * Parses academic document text into structured subjects, timetable slots, or calendar events.
 * Uses AI if available, or falls back to an intelligent multi-pattern timetable parser.
 */
export async function parseAcademicDocument(
  rawText: string,
  docType: "timetable_pdf" | "academic_calendar_pdf" | "syllabus_pdf" | "other",
  pdfBuffer?: Buffer
): Promise<AcademicExtractionData> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const isGemini = Boolean(geminiKey && geminiKey !== "your_gemini_api_key_here");

  const prompt = `
You are an expert college academic schedule parser.
Extract structured academic information from this ${docType === "timetable_pdf" ? "Weekly Timetable" : "Academic Calendar"} document.

STRICT INSTRUCTIONS:
1. Extract ALL subjects, course codes (e.g. 18CS61, CS601, DBMS, CNS, WT, AI, CD, DAA), lecture timings, lab slots, days of week, and room numbers.
2. If exact start/end hours are missing or written as periods (1, 2, 3...), map them to standard hours: 09:00-10:00, 10:00-11:00, 11:15-12:15, 12:15-13:15, 14:00-15:00, 15:00-16:00.
3. Normalize days: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6.
4. Output valid JSON only matching the schema:
{
  "subjects": [{ "code": "CS601", "name": "Database Management Systems", "credit": 3 }],
  "timetableSlots": [{ "subjectCode": "CS601", "subjectName": "Database Management Systems", "dayOfWeek": 1, "dayName": "Monday", "startTime": "09:00", "endTime": "10:00", "room": "LH-1", "type": "Lecture" }],
  "calendarEvents": []
}

DOCUMENT TEXT:
${rawText ? rawText.slice(0, 8000) : "Refer to the attached document image."}
`;

  // 1. First priority: Native Gemini Multimodal Vision (reads scanned PDF directly)
  if (isGemini) {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiKey!);
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" },
      });

      const parts: any[] = [];
      if (pdfBuffer && pdfBuffer.length > 0) {
        parts.push({
          inlineData: {
            data: pdfBuffer.toString("base64"),
            mimeType: "application/pdf",
          },
        });
      }
      parts.push(prompt);

      const result = await model.generateContent(parts);
      const content = result.response.text();
      if (content) {
        const parsed = JSON.parse(content) as AcademicExtractionData;
        if (parsed.subjects && parsed.subjects.length > 0) {
          parsed.subjects = parsed.subjects.map((sub, idx) => ({
            ...sub,
            color: sub.color || PALETTE[idx % PALETTE.length],
          }));
          return {
            subjects: parsed.subjects || [],
            timetableSlots: parsed.timetableSlots || [],
            calendarEvents: parsed.calendarEvents || [],
            semesterDates: parsed.semesterDates,
          };
        }
      }
    } catch (geminiError) {
      console.warn("Native Gemini multimodal extraction error:", geminiError);
    }
  }

  // 2. Second priority: OpenAI compatible API if configured
  if (openaiKey && openaiKey !== "your_openai_api_key_here") {
    try {
      const client = new OpenAI({
        apiKey: openaiKey,
        timeout: 8000,
        maxRetries: 1,
      });

      const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: "You extract structured academic schedules in valid JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content) as AcademicExtractionData;
        if (parsed.subjects && parsed.subjects.length > 0) {
          parsed.subjects = parsed.subjects.map((sub, idx) => ({
            ...sub,
            color: sub.color || PALETTE[idx % PALETTE.length],
          }));
          return {
            subjects: parsed.subjects || [],
            timetableSlots: parsed.timetableSlots || [],
            calendarEvents: parsed.calendarEvents || [],
            semesterDates: parsed.semesterDates,
          };
        }
      }
    } catch (apiError) {
      console.warn("OpenAI extraction skipped or timed out:", apiError);
    }
  }

  // 3. Third priority: Enhanced Fallback Parser (zero external dependency)
  return fallbackHeuristicParser(rawText, docType);
}

const COMMON_TABLE_STOPWORDS = new Set([
  "TIME", "TABLE", "TIMETABLE", "CLASS", "SECTION", "ROOM", "SEMESTER", "PERIOD",
  "COLLEGE", "DEPARTMENT", "ENGINEERING", "BRANCH", "DATE", "DAY", "LUNCH", "BREAK",
  "HOURS", "TOTAL", "WEEK", "SLOT", "THEORY", "PRACTICAL", "LAB", "BATCH", "SESSION",
  "ACADEMIC", "YEAR", "NAME", "FACULTY", "STAFF", "CODE", "TITLE", "CREDIT", "CREDITS",
  "FROM", "TILL", "NOTE", "SIGNATURE", "HOD", "PRINCIPAL", "DEAN", "INCHARGE"
]);

const STANDARD_PERIODS = [
  { startTime: "09:00", endTime: "10:00" },
  { startTime: "10:00", endTime: "11:00" },
  { startTime: "11:15", endTime: "12:15" },
  { startTime: "12:15", endTime: "13:15" },
  { startTime: "14:00", endTime: "15:00" },
  { startTime: "15:00", endTime: "16:00" },
  { startTime: "16:00", endTime: "17:00" },
];

/**
 * Intelligent deterministic fallback parser based on multi-pattern matching
 */
function fallbackHeuristicParser(
  text: string,
  docType: string
): AcademicExtractionData {
  const subjectsMap = new Map<string, ParsedSubject>();
  const timetableSlots: ParsedTimetableSlot[] = [];
  const calendarEvents: ParsedCalendarEvent[] = [];

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const dayMap: Record<string, number> = {
    monday: 1, mon: 1,
    tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4, thur: 4, thurs: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
    sunday: 0, sun: 0,
  };

  // Pattern for subject codes:
  // e.g. 18CS61, 21CS62, CS601, CS601PC, DBMS, CNS, WT, AI, CD, DAA, MATH301
  const codeRegex = /\b(\d{1,2}[A-Z]{2,4}\d{1,4}[A-Z]?|[A-Z]{2,6}[-\s]?\d{1,4}[A-Z]?|[A-Z]{2,6})\b/g;
  // Pattern for time (e.g. 9:00 - 10:00, 09:00 AM to 10:00 AM)
  const timeRegex = /(\d{1,2}:\d{2})\s*(?:AM|PM)?\s*(?:-|to)\s*(\d{1,2}:\d{2})\s*(AM|PM)?/i;

  // 1. Scan for legend tables (e.g., "18CS61 : System Software", "DBMS - Database Management")
  for (const line of lines) {
    const legendMatch = line.match(/^([A-Z0-9-]{3,10})\s*[-:=]\s*([A-Za-z0-9\s&,()]+)$/);
    if (legendMatch) {
      const code = legendMatch[1].trim().toUpperCase();
      const name = legendMatch[2].trim();
      if (!COMMON_TABLE_STOPWORDS.has(code) && name.length >= 3) {
        subjectsMap.set(code, {
          code,
          name,
          credit: 3,
          color: PALETTE[subjectsMap.size % PALETTE.length],
        });
      }
    }
  }

  // 2. Scan lines for days, times, and subject slots
  let currentDay = 1;
  let currentDayName = "Monday";
  let daySlotCounters: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Check for day headers
    for (const [dayKey, dayNum] of Object.entries(dayMap)) {
      if (new RegExp(`\\b${dayKey}\\b`, "i").test(lowerLine)) {
        currentDay = dayNum;
        currentDayName = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
        break;
      }
    }

    // Check for calendar events (Exam, Holiday, etc.)
    if (docType === "academic_calendar_pdf" || lowerLine.includes("exam") || lowerLine.includes("holiday")) {
      const isHoliday = /holiday|vacation|break|recess|sunday/i.test(line);
      const isExam = /exam|midsem|endsem|test|quiz|assessment/i.test(line);
      const isAssignment = /assignment|submission|project|deadline/i.test(line);

      const dateMatch = line.match(/\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/);
      if (dateMatch) {
        calendarEvents.push({
          title: line.replace(dateMatch[0], "").trim().slice(0, 60) || (isHoliday ? "Academic Holiday" : "Academic Event"),
          type: isExam ? "Exam" : isAssignment ? "Assignment" : isHoliday ? "Holiday" : "Event",
          date: dateMatch[0],
          isHoliday,
        });
      }
    }

    // Scan for subject codes
    const timeMatch = line.match(timeRegex);
    const rawTokens = line.match(codeRegex) || [];
    const validCodes = rawTokens.filter((token) => {
      const upper = token.trim().toUpperCase();
      return !COMMON_TABLE_STOPWORDS.has(upper) && upper.length >= 2;
    });

    for (const code of validCodes) {
      if (!subjectsMap.has(code)) {
        subjectsMap.set(code, {
          code,
          name: code,
          credit: 3,
          color: PALETTE[subjectsMap.size % PALETTE.length],
        });
      }

      let startTime = "09:00";
      let endTime = "10:00";

      if (timeMatch) {
        startTime = timeMatch[1].length === 4 ? "0" + timeMatch[1] : timeMatch[1];
        endTime = timeMatch[2].length === 4 ? "0" + timeMatch[2] : timeMatch[2];
      } else {
        const periodIdx = daySlotCounters[currentDay] % STANDARD_PERIODS.length;
        startTime = STANDARD_PERIODS[periodIdx].startTime;
        endTime = STANDARD_PERIODS[periodIdx].endTime;
        daySlotCounters[currentDay] = (daySlotCounters[currentDay] || 0) + 1;
      }

      // Avoid duplicate slot at same time on same day
      const existing = timetableSlots.find(
        (s) => s.dayOfWeek === currentDay && s.startTime === startTime
      );
      if (!existing) {
        timetableSlots.push({
          subjectCode: code,
          subjectName: subjectsMap.get(code)?.name || code,
          dayOfWeek: currentDay,
          dayName: currentDayName,
          startTime,
          endTime,
          room: line.includes("LH") || line.includes("Room") ? line.match(/(LH[- ]?\d+|Room[- ]?\d+)/i)?.[0] : "",
          type: /lab|practical/i.test(line) ? "Lab" : "Lecture",
        });
      }
    }
  }

  return {
    subjects: Array.from(subjectsMap.values()),
    timetableSlots,
    calendarEvents,
  };
}
