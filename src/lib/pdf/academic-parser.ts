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
 * Parses academic document text/buffer into structured subjects, timetable slots, or calendar events.
 * Strictly enforces document type separation:
 * - Academic Calendar PDF: ONLY extracts exams, assignments, holidays, and semester date boundaries.
 * - Weekly Timetable PDF: ONLY extracts subjects, days, slots, and rooms.
 */
export async function parseAcademicDocument(
  rawText: string,
  docType: "timetable_pdf" | "academic_calendar_pdf" | "syllabus_pdf" | "other",
  pdfBuffer?: Buffer
): Promise<AcademicExtractionData> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const isGemini = Boolean(geminiKey && geminiKey !== "your_gemini_api_key_here");
  const isCalendar = docType === "academic_calendar_pdf";

  const prompt = isCalendar
    ? `
You are an expert college academic calendar parser for "Academic AI".
Extract ONLY academic calendar events from this document.

STRICT INSTRUCTIONS:
1. Extract ALL exams (Midterm, End Semester, Assessment Tests, Unit Tests, Practical Exams), assignment deadlines, holidays (Pongal, Diwali, Republic Day, Gandhi Jayanti, Christmas, New Year, Vacation, Semester Break), and semester start/end boundaries.
2. For each event extract:
   - title: Name of event or holiday (e.g. "Pongal Holiday", "Mid-Semester Examination", "Semester Commencement")
   - type: "Holiday" | "Exam" | "Assignment" | "Event" | "SemesterStart" | "SemesterEnd"
   - date: Start date in "YYYY-MM-DD" format (assume current academic year 2026/2027 if year is implied)
   - endDate: End date in "YYYY-MM-DD" if the holiday or exam spans multiple days (e.g. Pongal holidays Jan 14 to Jan 18)
   - isHoliday: true if classes/college is closed, false otherwise
   - description: Brief note or details
3. Do NOT extract subjects or weekly lecture slots. Return subjects as [] and timetableSlots as [].
4. Output valid JSON matching this schema only without markdown:
{
  "calendarEvents": [
    {
      "title": "Pongal Holiday",
      "type": "Holiday",
      "date": "2027-01-14",
      "endDate": "2027-01-18",
      "isHoliday": true,
      "description": "Pongal festival vacation"
    }
  ],
  "semesterDates": { "startDate": "2026-08-01", "endDate": "2026-12-15" },
  "subjects": [],
  "timetableSlots": []
}

DOCUMENT TEXT:
${rawText ? rawText.slice(0, 8000) : "Refer to the attached document image."}
`
    : `
You are an expert college timetable parser for "Academic AI".
Extract ONLY the weekly class timetable from this document.

STRICT INSTRUCTIONS:
1. Extract ALL enrolled subjects, course codes (e.g. 18CS61, CS601, DBMS, CNS, WT, AI, CD, DAA, MATH), days of the week, lecture/lab slots with start & end times, and room numbers.
2. If exact start/end hours are missing or written as periods (1, 2, 3...), map them to standard college hours: 09:00-10:00, 10:00-11:00, 11:15-12:15, 12:15-13:15, 14:00-15:00, 15:00-16:00.
3. Normalize days: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6.
4. Do NOT extract calendar holidays. Return calendarEvents as [].
5. Output valid JSON matching this schema only without markdown:
{
  "subjects": [
    { "code": "CS601", "name": "Database Management Systems", "credit": 3 }
  ],
  "timetableSlots": [
    { "subjectCode": "CS601", "subjectName": "Database Management Systems", "dayOfWeek": 1, "dayName": "Monday", "startTime": "09:00", "endTime": "10:00", "room": "LH-1", "type": "Lecture" }
  ],
  "calendarEvents": []
}

DOCUMENT TEXT:
${rawText ? rawText.slice(0, 8000) : "Refer to the attached document image."}
`;

  // 1. First priority: Native Gemini Multimodal Vision / Language API
  if (isGemini) {
    const candidateModels = [
      process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
      "gemini-3.5-flash-lite",
      "gemini-flash-latest",
    ];

    for (const mName of candidateModels) {
      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(geminiKey!);
        const model = genAI.getGenerativeModel({
          model: mName,
          generationConfig: { responseMimeType: "application/json" },
        });

        const parts: any[] = [];
        // Only attach raw PDF buffer for visual scanned timetables
        if (!isCalendar && pdfBuffer && pdfBuffer.length > 0) {
          parts.push({
            inlineData: {
              data: pdfBuffer.toString("base64"),
              mimeType: "application/pdf",
            },
          });
        }
        parts.push(prompt);

        let content = "";
        try {
          const result = await model.generateContent(parts);
          content = result.response.text();
        } catch (callWithBufferErr) {
          // If multimodal binary buffer fails (e.g. 400), retry text-only
          if (parts.length > 1) {
            const retryRes = await model.generateContent(prompt);
            content = retryRes.response.text();
          } else {
            throw callWithBufferErr;
          }
        }

        if (content) {
          const parsed = JSON.parse(content) as AcademicExtractionData;
          if (isCalendar) {
            if (parsed.calendarEvents && parsed.calendarEvents.length > 0) {
              return {
                subjects: [],
                timetableSlots: [],
                calendarEvents: parsed.calendarEvents || [],
                semesterDates: parsed.semesterDates,
              };
            }
          } else {
            if (parsed.subjects && parsed.subjects.length > 0) {
              parsed.subjects = parsed.subjects.map((sub, idx) => ({
                ...sub,
                color: sub.color || PALETTE[idx % PALETTE.length],
              }));
              const normalizedSlots = (parsed.timetableSlots || []).map((slot) => {
                const fix24 = (t: string) => {
                  if (!t) return t;
                  const parts = t.trim().split(":");
                  if (parts.length < 2) return t;
                  let h = parseInt(parts[0], 10);
                  const m = parts[1].replace(/[^0-9]/g, "").padStart(2, "0");
                  if (h >= 1 && h <= 6) h += 12;
                  return `${String(h).padStart(2, "0")}:${m}`;
                };
                return {
                  ...slot,
                  startTime: fix24(slot.startTime),
                  endTime: fix24(slot.endTime),
                };
              });

              return {
                subjects: parsed.subjects || [],
                timetableSlots: normalizedSlots,
                calendarEvents: [],
                semesterDates: parsed.semesterDates,
              };
            }
          }
        }
      } catch (geminiError) {
        console.warn(`Gemini model ${mName} attempt skipped:`, geminiError);
      }
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
        if (isCalendar) {
          if (parsed.calendarEvents && parsed.calendarEvents.length > 0) {
            return {
              subjects: [],
              timetableSlots: [],
              calendarEvents: parsed.calendarEvents || [],
              semesterDates: parsed.semesterDates,
            };
          }
        } else {
          if (parsed.subjects && parsed.subjects.length > 0) {
            parsed.subjects = parsed.subjects.map((sub, idx) => ({
              ...sub,
              color: sub.color || PALETTE[idx % PALETTE.length],
            }));
            return {
              subjects: parsed.subjects || [],
              timetableSlots: parsed.timetableSlots || [],
              calendarEvents: [],
              semesterDates: parsed.semesterDates,
            };
          }
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
  const isCalendar = docType === "academic_calendar_pdf";
  const subjectsMap = new Map<string, ParsedSubject>();
  const timetableSlots: ParsedTimetableSlot[] = [];
  const calendarEvents: ParsedCalendarEvent[] = [];

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Month mapping
  const monthMap: Record<string, string> = {
    jan: "01", january: "01",
    feb: "02", february: "02",
    mar: "03", march: "03",
    apr: "04", april: "04",
    may: "05",
    jun: "06", june: "06",
    jul: "07", july: "07",
    aug: "08", august: "08",
    sep: "09", september: "09",
    oct: "10", october: "10",
    nov: "11", november: "11",
    dec: "12", december: "12",
  };

  // IF CALENDAR: ONLY extract calendar events & holidays (Pongal, Diwali, Exams, etc.)
  if (isCalendar) {
    const denseDateRegex = /^(\d{2})-([A-Za-z]{3})(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?(.*)$/i;
    const hasDenseFormat = lines.some((l) => denseDateRegex.test(l));

    if (hasDenseFormat) {
      // Specialized university calendar parser (e.g. Amrita Vishwa Vidyapeetham)
      const rawEvents: ParsedCalendarEvent[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(denseDateRegex);
        if (match) {
          const day = match[1];
          const mStr = match[2].toLowerCase();
          const monthNum = monthMap[mStr];
          if (!monthNum) continue;

          const mInt = parseInt(monthNum, 10);
          const year = mInt >= 6 ? 2026 : 2027;
          const dateStr = `${year}-${monthNum}-${day}`;
          const rest = (match[3] || "").trim();

          let nextLine = (lines[i + 1] || "").trim();
          let eventTitle = "";

          if (/holiday/i.test(line) || /holiday/i.test(rest)) {
            const cleanRest = rest.replace(/^[A-Za-z0-9\s]*Holiday\s*[-–]?\s*/i, "").trim();
            eventTitle = cleanRest || "Holiday";
          }

          if (nextLine && !nextLine.match(denseDateRegex) && !nextLine.match(/^(?:date|day|tt|ttt|tv|details)/i)) {
            if (/exam|midterm|end semester|commencement|reopening/i.test(nextLine)) {
              rawEvents.push({
                title: nextLine,
                type: "Exam",
                date: dateStr,
                isHoliday: false,
                description: nextLine,
              });
            } else if (!eventTitle || eventTitle === "Holiday") {
              eventTitle = nextLine;
            }
          }

          if (eventTitle) {
            rawEvents.push({
              title: eventTitle,
              type: "Holiday",
              date: dateStr,
              isHoliday: true,
              description: eventTitle,
            });
          }
        }
      }

      // Group consecutive holiday events (e.g. Pongal holidays Jan 14 to Jan 17)
      for (let i = 0; i < rawEvents.length; i++) {
        const curr = rawEvents[i];
        if (curr.type === "Holiday" && /pongal|uzhavar/i.test(curr.title)) {
          let startDate = curr.date;
          let endDate = curr.date;

          while (i + 1 < rawEvents.length) {
            const next = rawEvents[i + 1];
            const currD = new Date(endDate);
            const nextD = new Date(next.date);
            const diffDays = Math.round((nextD.getTime() - currD.getTime()) / (1000 * 3600 * 24));
            if (diffDays <= 2 && next.type === "Holiday") {
              endDate = next.date;
              i++;
            } else {
              break;
            }
          }

          calendarEvents.push({
            title: "Pongal Holidays",
            type: "Holiday",
            date: startDate,
            endDate: endDate !== startDate ? endDate : undefined,
            isHoliday: true,
            description: "Pongal festival vacation",
          });
        } else if (curr.title && curr.title !== "Holiday") {
          calendarEvents.push(curr);
        }
      }

      return {
        subjects: [],
        timetableSlots: [],
        calendarEvents,
      };
    }

    const currentYear = new Date().getFullYear();

    for (const line of lines) {
      const lower = line.toLowerCase();
      const isHoliday = /holiday|vacation|break|recess|pongal|diwali|deepavali|sankranti|christmas|republic|gandhi|independence|eid|muharram|sunday|leave/i.test(line);
      const isExam = /exam|midsem|endsem|test|assessment|quiz|practical exam/i.test(line);
      const isAssignment = /assignment|submission|project deadline/i.test(line);
      const isSemesterDate = /commencement|reopen|start of|end of|last working|closure/i.test(line);

      if (isHoliday || isExam || isAssignment || isSemesterDate) {
        // Match dates: DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY, or "14 Jan 2027", "14th January"
        let dateStr = "";
        let endDateStr: string | undefined = undefined;

        const numDateMatch = line.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
        const textDateMatch = line.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{4})?\b/i);

        if (numDateMatch) {
          const d = numDateMatch[1].padStart(2, "0");
          const m = numDateMatch[2].padStart(2, "0");
          let y = numDateMatch[3];
          if (y.length === 2) y = "20" + y;
          dateStr = `${y}-${m}-${d}`;
        } else if (textDateMatch) {
          const d = textDateMatch[1].padStart(2, "0");
          const m = monthMap[textDateMatch[2].toLowerCase()] || "01";
          const y = textDateMatch[3] || String(currentYear);
          dateStr = `${y}-${m}-${d}`;
        }

        // Match date ranges like "14 to 18 Jan" or "14.01.2027 - 18.01.2027"
        const rangeMatch = line.match(/(?:to|-)\s*(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
        if (rangeMatch) {
          const ed = rangeMatch[1].padStart(2, "0");
          const em = rangeMatch[2].padStart(2, "0");
          let ey = rangeMatch[3];
          if (ey.length === 2) ey = "20" + ey;
          endDateStr = `${ey}-${em}-${ed}`;
        }

        if (dateStr) {
          let eventType: ParsedCalendarEvent["type"] = "Event";
          if (isHoliday) eventType = "Holiday";
          else if (isExam) eventType = "Exam";
          else if (isAssignment) eventType = "Assignment";
          else if (lower.includes("start") || lower.includes("commence") || lower.includes("reopen")) eventType = "SemesterStart";
          else if (lower.includes("end") || lower.includes("last working") || lower.includes("closure")) eventType = "SemesterEnd";

          // Clean title
          const title = line
            .replace(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/g, "")
            .replace(/\b\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s*\d{0,4}\b/g, "")
            .replace(/^[-:•\s]+/, "")
            .trim()
            .slice(0, 65) || (isHoliday ? "Academic Holiday" : "Academic Event");

          calendarEvents.push({
            title,
            type: eventType,
            date: dateStr,
            endDate: endDateStr,
            isHoliday,
            description: line.slice(0, 150),
          });
        }
      }
    }

    return {
      subjects: [],
      timetableSlots: [],
      calendarEvents,
    };
  }

  // IF TIMETABLE: ONLY extract subjects and weekly lecture slots
  const dayMap: Record<string, number> = {
    monday: 1, mon: 1,
    tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4, thur: 4, thurs: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
    sunday: 0, sun: 0,
  };

  const codeRegex = /\b(\d{1,2}[A-Z]{2,4}\d{1,4}[A-Z]?|[A-Z]{2,6}[-\s]?\d{1,4}[A-Z]?|[A-Z]{2,6})\b/g;
  const timeRegex = /(\d{1,2}:\d{2})\s*(?:AM|PM)?\s*(?:-|to)\s*(\d{1,2}:\d{2})\s*(AM|PM)?/i;

  // Scan legend tables
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

  let currentDay = 1;
  let currentDayName = "Monday";
  let daySlotCounters: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    for (const [dayKey, dayNum] of Object.entries(dayMap)) {
      if (new RegExp(`\\b${dayKey}\\b`, "i").test(lowerLine)) {
        currentDay = dayNum;
        currentDayName = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
        break;
      }
    }

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
    calendarEvents: [],
  };
}
