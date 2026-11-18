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
 * Strict rule: Never invent missing information.
 */
export async function parseAcademicDocument(
  rawText: string,
  docType: "timetable_pdf" | "academic_calendar_pdf" | "syllabus_pdf" | "other"
): Promise<AcademicExtractionData> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const isGemini = Boolean(geminiKey && geminiKey !== "your_gemini_api_key_here");
  const apiKey = isGemini ? geminiKey : openaiKey;
  const baseURL = isGemini ? "https://generativelanguage.googleapis.com/v1beta/openai/" : undefined;
  const modelName = isGemini
    ? process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"
    : process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (apiKey && apiKey !== "your_openai_api_key_here") {
    try {
      const client = new OpenAI({
        apiKey,
        baseURL,
        timeout: 8000,
        maxRetries: 1,
      });

      const prompt = `
You are an expert academic document parser for "Academic AI".
Extract structured academic information from the document text provided below.

DOCUMENT TYPE: ${docType}

STRICT INSTRUCTIONS:
1. ONLY extract information that is explicitly stated in the document.
2. NEVER invent, hallucinate, or assume missing subjects, days, times, exam dates, or holidays.
3. If days or times are not mentioned, do not guess them.
4. Normalize times to 24-hour "HH:mm" (e.g., "09:00", "14:30").
5. Normalize days of the week: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6.
6. For calendar events, normalize dates to "YYYY-MM-DD" if year is identifiable, or assume current/next academic year (2026/2027).
7. Return valid JSON matching the exact schema specified below without any markdown code fence.

JSON SCHEMA:
{
  "subjects": [
    { "code": "CS101", "name": "Computer Programming", "credit": 3, "faculty": "Dr. Smith" }
  ],
  "timetableSlots": [
    {
      "subjectCode": "CS101",
      "subjectName": "Computer Programming",
      "dayOfWeek": 1,
      "dayName": "Monday",
      "startTime": "09:00",
      "endTime": "10:00",
      "room": "LH-1",
      "type": "Lecture"
    }
  ],
  "calendarEvents": [
    {
      "title": "Midterm Examination",
      "type": "Exam",
      "date": "2026-10-15",
      "endDate": "2026-10-22",
      "description": "Mid-semester exams",
      "isHoliday": false
    }
  ],
  "semesterDates": {
    "startDate": "2026-08-01",
    "endDate": "2026-12-15"
  }
}

DOCUMENT TEXT:
${rawText.slice(0, 8000)}
`;

      const response = await client.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: "system",
            content: "You extract structured academic schedules accurately in valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content) as AcademicExtractionData;
        // Assign colors to subjects if missing
        if (parsed.subjects) {
          parsed.subjects = parsed.subjects.map((sub, idx) => ({
            ...sub,
            color: sub.color || PALETTE[idx % PALETTE.length],
          }));
        }
        return {
          subjects: parsed.subjects || [],
          timetableSlots: parsed.timetableSlots || [],
          calendarEvents: parsed.calendarEvents || [],
          semesterDates: parsed.semesterDates,
        };
      }
    } catch (apiError) {
      console.warn("OpenAI extraction failed, falling back to heuristic parser:", apiError);
    }
  }

  // Heuristic / Regex Fallback Parser (zero external dependency fallback)
  return fallbackHeuristicParser(rawText, docType);
}

/**
 * Deterministic fallback parser based on pattern matching
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

  // Pattern for subject code (e.g. CS101, CSE-201, MATH301, DBMS)
  const codeRegex = /\b([A-Z]{2,4}[-\s]?[0-9]{3,4}|[A-Z]{3,6})\b/g;
  // Pattern for time (e.g. 9:00 - 10:00 or 09:00 AM to 10:00 AM)
  const timeRegex = /(\d{1,2}:\d{2})\s*(?:AM|PM)?\s*(?:-|to)\s*(\d{1,2}:\d{2})\s*(AM|PM)?/i;

  let currentDay = 1;
  let currentDayName = "Monday";

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

    // Check for calendar events like "Mid Term", "End Term", "Holiday", "Diwali", etc.
    if (docType === "academic_calendar_pdf" || lowerLine.includes("exam") || lowerLine.includes("holiday")) {
      const isHoliday = /holiday|vacation|break|recess/i.test(line);
      const isExam = /exam|midsem|endsem|test|quiz/i.test(line);
      const isAssignment = /assignment|submission|project/i.test(line);

      // Date match like 15-10-2026, 2026-10-15, 15 Oct, etc.
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

    // Check for timetable time slot
    const timeMatch = line.match(timeRegex);
    const codes = line.match(codeRegex);

    if (codes && codes.length > 0) {
      const code = codes[0].replace(/\s+/g, "");
      if (!subjectsMap.has(code)) {
        subjectsMap.set(code, {
          code,
          name: code,
          credit: 3,
          color: PALETTE[subjectsMap.size % PALETTE.length],
        });
      }

      if (timeMatch) {
        let startTime = timeMatch[1];
        let endTime = timeMatch[2];
        // Normalize single digit hours: "9:00" -> "09:00"
        if (startTime.length === 4) startTime = "0" + startTime;
        if (endTime.length === 4) endTime = "0" + endTime;

        timetableSlots.push({
          subjectCode: code,
          subjectName: code,
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
