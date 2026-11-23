import { IGateSubject } from "../db/models/GateSubject";

export interface ScheduledSessionSlot {
  subjectId?: string;
  subjectName: string;
  subjectCode: string;
  color: string;
  timeSlot: string;
  plannedHours: number;
  plannedVideos: number;
  sessionType: "Lecture" | "Revision" | "Buffer" | "PYQ Practice";
  topics: string;
}

export interface DayStudySchedule {
  date: string; // YYYY-MM-DD
  dayName: string; // e.g. "Monday"
  isRestDay: boolean;
  totalPlannedHours: number;
  slots: ScheduledSessionSlot[];
  statusSummary: string;
}

export interface WeeklyStudyPlan {
  startDate: string;
  endDate: string;
  totalWeeklyHours: number;
  studyDaysCount: number;
  days: DayStudySchedule[];
  subjectHourBreakdown: { subjectCode: string; subjectName: string; hours: number }[];
}

/**
 * Intelligent generator for daily and weekly GATE study schedules
 */
export function generateGateSchedule(params: {
  subjects: any[];
  startDate?: Date;
  daysToGenerate?: number;
  dailyStudyHours?: number;
  deadline?: Date;
}): DayStudySchedule[] {
  const {
    subjects,
    startDate = new Date(),
    daysToGenerate = 14,
    dailyStudyHours = 10,
  } = params;

  // Filter and sort subjects by priority order and remaining hours
  const activeSubjects = subjects
    .filter((s) => (s.remainingVideos || 0) > 0 || (s.remainingHours || 0) > 0)
    .sort((a, b) => {
      // Prioritize High over Medium over Low
      const pMap: Record<string, number> = { High: 1, Medium: 2, Low: 3 };
      const pDiff = (pMap[a.priority] || 2) - (pMap[b.priority] || 2);
      if (pDiff !== 0) return pDiff;
      return (a.priorityOrder || 99) - (b.priorityOrder || 99);
    });

  // Track virtual remaining hours as we allocate across days
  const virtualRemaining: { [id: string]: number } = {};
  for (const s of activeSubjects) {
    const id = s._id ? s._id.toString() : s.code;
    const dur = s.averageVideoDuration || 1.5;
    const hrs = s.remainingHours || (s.remainingVideos || 0) * dur;
    virtualRemaining[id] = hrs;
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const scheduleDays: DayStudySchedule[] = [];

  const msPerDay = 1000 * 60 * 60 * 24;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  // Helper to get next subject with remaining hours
  let currentSubIdx = 0;
  function getNextAvailableSubject(): any | null {
    while (currentSubIdx < activeSubjects.length) {
      const sub = activeSubjects[currentSubIdx];
      const id = sub._id ? sub._id.toString() : sub.code;
      if ((virtualRemaining[id] || 0) > 0.2) {
        return sub;
      }
      currentSubIdx++;
    }
    return null;
  }

  for (let dayOffset = 0; dayOffset < daysToGenerate; dayOffset++) {
    const dayDate = new Date(start.getTime() + dayOffset * msPerDay);
    const dayOfWeek = dayDate.getDay();
    const dayName = dayNames[dayOfWeek];
    const dateStr = dayDate.toISOString().split("T")[0];

    // Sunday = Rest & Optional Revision Day
    if (dayOfWeek === 0) {
      scheduleDays.push({
        date: dateStr,
        dayName,
        isRestDay: true,
        totalPlannedHours: 0,
        statusSummary: "🏖️ Rest & Optional Revision Day (Mental recharging & formula review)",
        slots: [
          {
            subjectName: "Weekly Revision & Formula Review",
            subjectCode: "REVISION",
            color: "#64748B",
            timeSlot: "10:00 - 12:00",
            plannedHours: 2.0,
            plannedVideos: 0,
            sessionType: "Revision",
            topics: "Active recall of formulas, short notes, and weekly mistakes",
          },
          {
            subjectName: "Personal Rest & Recharging",
            subjectCode: "REST",
            color: "#94A3B8",
            timeSlot: "12:00 onwards",
            plannedHours: 0,
            plannedVideos: 0,
            sessionType: "Buffer",
            topics: "No mandatory study hours. Rest to maintain peak weekly stamina.",
          },
        ],
      });
      continue;
    }

    // Monday through Saturday = 10 Study Hours
    // Distribution:
    // Slot 1: Morning Deep Focus (4.0 hrs) - 08:30 to 12:30
    // Slot 2: Midday Session (3.0 hrs) - 13:30 to 16:30
    // Slot 3: Afternoon Session (2.0 hrs) - 17:30 to 19:30
    // Slot 4: Evening Revision & Buffer (1.0 hr) - 20:30 to 21:30
    const daySlots: ScheduledSessionSlot[] = [];
    let allocatedToday = 0;

    // Slot 1: 4.0 Hours
    const sub1 = getNextAvailableSubject();
    if (sub1) {
      const id1 = sub1._id ? sub1._id.toString() : sub1.code;
      const plannedH = Math.min(4.0, virtualRemaining[id1] || 4.0);
      const plannedV = Math.max(1, Math.round(plannedH / (sub1.averageVideoDuration || 1.5)));
      virtualRemaining[id1] = Math.max(0, (virtualRemaining[id1] || 0) - plannedH);
      allocatedToday += plannedH;

      daySlots.push({
        subjectId: id1,
        subjectName: sub1.name,
        subjectCode: sub1.code,
        color: sub1.color || "#3B82F6",
        timeSlot: "08:30 - 12:30",
        plannedHours: plannedH,
        plannedVideos: plannedV,
        sessionType: "Lecture",
        topics: `Deep Focus: Concepts & Problem Solving for ${sub1.name}`,
      });
    }

    // Slot 2: 3.0 Hours
    const sub2 = getNextAvailableSubject() || sub1;
    if (sub2) {
      const id2 = sub2._id ? sub2._id.toString() : sub2.code;
      const plannedH = Math.min(3.0, virtualRemaining[id2] || 3.0);
      const plannedV = Math.max(1, Math.round(plannedH / (sub2.averageVideoDuration || 1.5)));
      virtualRemaining[id2] = Math.max(0, (virtualRemaining[id2] || 0) - plannedH);
      allocatedToday += plannedH;

      daySlots.push({
        subjectId: id2,
        subjectName: sub2.name,
        subjectCode: sub2.code,
        color: sub2.color || "#10B981",
        timeSlot: "13:30 - 16:30",
        plannedHours: plannedH,
        plannedVideos: plannedV,
        sessionType: "Lecture",
        topics: `Core Lecture Coverage: ${sub2.name}`,
      });
    }

    // Slot 3: 2.0 Hours
    const sub3 = getNextAvailableSubject() || sub2 || sub1;
    if (sub3) {
      const id3 = sub3._id ? sub3._id.toString() : sub3.code;
      const plannedH = Math.min(2.0, virtualRemaining[id3] || 2.0);
      const plannedV = Math.max(1, Math.round(plannedH / (sub3.averageVideoDuration || 1.5)));
      virtualRemaining[id3] = Math.max(0, (virtualRemaining[id3] || 0) - plannedH);
      allocatedToday += plannedH;

      daySlots.push({
        subjectId: id3,
        subjectName: sub3.name,
        subjectCode: sub3.code,
        color: sub3.color || "#F59E0B",
        timeSlot: "17:30 - 19:30",
        plannedHours: plannedH,
        plannedVideos: plannedV,
        sessionType: "Lecture",
        topics: `Topic Practice & Lecture Series: ${sub3.name}`,
      });
    }

    // Slot 4: 1.0 Hour Revision & Buffer
    allocatedToday += 1.0;
    daySlots.push({
      subjectName: "Daily Revision & Topic Buffer",
      subjectCode: "BUFFER",
      color: "#8B5CF6",
      timeSlot: "20:30 - 21:30",
      plannedHours: 1.0,
      plannedVideos: 0,
      sessionType: "Revision",
      topics: "Daily synthesis, formula book update, and unfinished topic buffer",
    });

    scheduleDays.push({
      date: dateStr,
      dayName,
      isRestDay: false,
      totalPlannedHours: Math.min(dailyStudyHours, allocatedToday),
      statusSummary: `${allocatedToday} Hours Planned (${daySlots.length} sessions, 1h revision buffer)`,
      slots: daySlots,
    });
  }

  return scheduleDays;
}

/**
 * Reschedules unfinished or missed hours into future study sessions
 */
export function rescheduleMissedHours(params: {
  missedHours: number;
  missedSubjectId?: string;
  upcomingDays: DayStudySchedule[];
  maxDailyHours?: number;
}): DayStudySchedule[] {
  const { missedHours, missedSubjectId, upcomingDays, maxDailyHours = 10 } = params;
  let remainingToDistribute = missedHours;

  const adjusted = [...upcomingDays];
  for (const day of adjusted) {
    if (remainingToDistribute <= 0) break;
    if (day.isRestDay) continue; // Don't compromise rest days

    // If day has capacity under maxDailyHours
    const spare = Math.max(0, maxDailyHours - day.totalPlannedHours);
    if (spare > 0) {
      const add = Math.min(spare, remainingToDistribute);
      day.totalPlannedHours += add;
      remainingToDistribute -= add;

      // Add rescheduled buffer slot
      day.slots.push({
        subjectId: missedSubjectId,
        subjectName: "Rescheduled Missed Session",
        subjectCode: "MAKEUP",
        color: "#EF4444",
        timeSlot: "Catch-up Window",
        plannedHours: add,
        plannedVideos: 1,
        sessionType: "Buffer",
        topics: `Catch-up for unfinished sessions (${add} hrs)`,
      });
    }
  }

  return adjusted;
}
