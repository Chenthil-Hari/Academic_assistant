/**
 * Attendance Calculation Engine
 * 
 * Formula:
 * Attendance % = (Attended Classes / Conducted Classes) * 100
 * Cancelled and Pending classes MUST NOT count as conducted classes.
 */

export interface SubjectAttendanceMetrics {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  color?: string;
  attended: number;
  absent: number;
  conducted: number; // attended + absent
  cancelled: number;
  pending: number;
  percentage: number; // rounded to 2 decimals
  targetPercentage: number;
  classesNeededForTarget: number; // to reach target %
  maxClassesCanMiss: number; // bunk buffer while staying >= target %
  status: "Safe" | "Warning" | "Critical";
}

export interface OverallAttendanceMetrics {
  totalAttended: number;
  totalAbsent: number;
  totalConducted: number;
  totalCancelled: number;
  totalPending: number;
  overallPercentage: number;
  targetPercentage: number;
  classesNeededForTarget: number;
  maxClassesCanMiss: number;
  lowestAttendanceSubject: {
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    percentage: number;
  } | null;
  status: "Safe" | "Warning" | "Critical";
}

/**
 * Calculates consecutive classes needed to reach target percentage.
 * Formula: x >= (T * Conducted - 100 * Attended) / (100 - T)
 */
export function calculateClassesNeeded(
  attended: number,
  conducted: number,
  targetPercentage: number
): number {
  if (conducted === 0) return 0;
  if (targetPercentage >= 100) {
    if (attended === conducted) return 0;
    return Infinity; // mathematically impossible if already missed a class
  }

  const currentPercent = (attended / conducted) * 100;
  if (currentPercent >= targetPercentage) return 0;

  const numerator = targetPercentage * conducted - 100 * attended;
  const denominator = 100 - targetPercentage;
  const needed = Math.ceil(numerator / denominator);
  return Math.max(0, needed);
}

/**
 * Calculates maximum classes a student can safely miss without dropping below target percentage.
 * Formula: y <= (100 * Attended - T * Conducted) / T
 */
export function calculateMaxClassesCanMiss(
  attended: number,
  conducted: number,
  targetPercentage: number
): number {
  if (targetPercentage <= 0) return 999;
  if (conducted === 0) return 0;

  const currentPercent = (attended / conducted) * 100;
  if (currentPercent < targetPercentage) return 0;

  const numerator = 100 * attended - targetPercentage * conducted;
  const denominator = targetPercentage;
  const canMiss = Math.floor(numerator / denominator);
  return Math.max(0, canMiss);
}

/**
 * Calculates attendance status category
 */
export function getAttendanceStatus(percentage: number, targetPercentage: number = 75): "Safe" | "Warning" | "Critical" {
  if (percentage >= targetPercentage) return "Safe";
  if (percentage >= targetPercentage - 10) return "Warning";
  return "Critical";
}

/**
 * Computes individual subject metrics
 */
export function calculateSubjectMetrics(params: {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  color?: string;
  attended: number;
  absent: number;
  cancelled: number;
  pending: number;
  targetPercentage?: number;
}): SubjectAttendanceMetrics {
  const target = params.targetPercentage ?? 75;
  const conducted = params.attended + params.absent;
  const percentage = conducted === 0 ? 100 : Number(((params.attended / conducted) * 100).toFixed(2));
  const classesNeeded = calculateClassesNeeded(params.attended, conducted, target);
  const maxCanMiss = calculateMaxClassesCanMiss(params.attended, conducted, target);
  const status = conducted === 0 ? "Safe" : getAttendanceStatus(percentage, target);

  return {
    subjectId: params.subjectId,
    subjectCode: params.subjectCode,
    subjectName: params.subjectName,
    color: params.color,
    attended: params.attended,
    absent: params.absent,
    conducted,
    cancelled: params.cancelled,
    pending: params.pending,
    percentage,
    targetPercentage: target,
    classesNeededForTarget: classesNeeded,
    maxClassesCanMiss: maxCanMiss,
    status,
  };
}

/**
 * Computes overall summary across all subjects
 */
export function calculateOverallMetrics(
  subjectMetrics: SubjectAttendanceMetrics[],
  targetPercentage: number = 75
): OverallAttendanceMetrics {
  let totalAttended = 0;
  let totalAbsent = 0;
  let totalCancelled = 0;
  let totalPending = 0;

  let lowestSub: { subjectId: string; subjectCode: string; subjectName: string; percentage: number } | null = null;
  let minPct = 101;

  for (const sub of subjectMetrics) {
    totalAttended += sub.attended;
    totalAbsent += sub.absent;
    totalCancelled += sub.cancelled;
    totalPending += sub.pending;

    // Only consider subjects that have at least one conducted class for lowest
    if (sub.conducted > 0 && sub.percentage < minPct) {
      minPct = sub.percentage;
      lowestSub = {
        subjectId: sub.subjectId,
        subjectCode: sub.subjectCode,
        subjectName: sub.subjectName,
        percentage: sub.percentage,
      };
    }
  }

  const totalConducted = totalAttended + totalAbsent;
  const overallPercentage = totalConducted === 0 ? 100 : Number(((totalAttended / totalConducted) * 100).toFixed(2));
  const classesNeeded = calculateClassesNeeded(totalAttended, totalConducted, targetPercentage);
  const maxCanMiss = calculateMaxClassesCanMiss(totalAttended, totalConducted, targetPercentage);
  const status = totalConducted === 0 ? "Safe" : getAttendanceStatus(overallPercentage, targetPercentage);

  return {
    totalAttended,
    totalAbsent,
    totalConducted,
    totalCancelled,
    totalPending,
    overallPercentage,
    targetPercentage,
    classesNeededForTarget: classesNeeded,
    maxClassesCanMiss: maxCanMiss,
    lowestAttendanceSubject: lowestSub,
    status,
  };
}

export interface SubjectSemesterPrediction {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  currentAttended: number;
  currentConducted: number;
  currentPercentage: number;
  targetPercentage: number;
  remainingClasses: number;
  totalSemesterConducted: number;
  maxAchievablePercentage: number;
  minAttendancePercentage: number;
  canReachTarget: boolean;
  classesNeededOfRemaining: number;
  maxCanMissOfRemaining: number;
  status: "Safe" | "AtRisk" | "CannotReachTarget";
}

export interface SemesterPredictionSummary {
  semesterEndDate: string;
  daysRemaining: number;
  holidaysCount: number;
  totalRemainingClasses: number;
  totalSemesterConducted: number;
  currentOverallPercentage: number;
  maxAchievableOverallPercentage: number;
  minOverallPercentage: number;
  canReachOverallTarget: boolean;
  totalClassesNeededOfRemaining: number;
  totalCanMissOfRemaining: number;
  subjects: SubjectSemesterPrediction[];
}

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates End-of-Semester attendance projections by cross-referencing
 * current attendance records, active weekly timetable, and calendar holiday/end dates.
 */
export function calculateSemesterPredictions(params: {
  subjects: SubjectAttendanceMetrics[];
  timetableSlots: Array<{
    subjectId: string;
    dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  }>;
  academicEvents: Array<{
    date: string | Date;
    endDate?: string | Date;
    type: string;
    isHoliday?: boolean;
  }>;
  targetPercentage?: number;
  startDate?: Date;
  fallbackDays?: number;
}): SemesterPredictionSummary {
  const target = params.targetPercentage ?? 75;
  const start = params.startDate ? new Date(params.startDate) : new Date();
  start.setHours(0, 0, 0, 0);

  // Find SemesterEnd date from academic events
  let semesterEnd: Date | null = null;
  for (const ev of params.academicEvents) {
    if (ev.type === "SemesterEnd") {
      const d = new Date(ev.date);
      if (d > start && (!semesterEnd || d < semesterEnd)) {
        semesterEnd = d;
      }
    }
  }

  // If no explicit SemesterEnd event, look for latest event or default to 60 days
  if (!semesterEnd) {
    let latestEventDate: Date | null = null;
    for (const ev of params.academicEvents) {
      const d = new Date(ev.endDate || ev.date);
      if (d > start && (!latestEventDate || d > latestEventDate)) {
        latestEventDate = d;
      }
    }
    if (latestEventDate) {
      semesterEnd = latestEventDate;
    } else {
      semesterEnd = new Date(start.getTime() + (params.fallbackDays || 60) * 24 * 60 * 60 * 1000);
    }
  }
  semesterEnd.setHours(23, 59, 59, 999);

  // Build a Set of holiday date strings (YYYY-MM-DD) using local date string to avoid timezone offset shifts
  const holidayDateSet = new Set<string>();
  for (const ev of params.academicEvents) {
    if (ev.isHoliday || ev.type === "Holiday") {
      const evStart = new Date(ev.date);
      const evEnd = ev.endDate ? new Date(ev.endDate) : evStart;
      const curr = new Date(evStart);
      while (curr <= evEnd) {
        holidayDateSet.add(toLocalDateStr(curr));
        curr.setDate(curr.getDate() + 1);
      }
    }
  }

  // Count remaining classes per subject by iterating through days from tomorrow to semesterEnd
  const remainingCountBySubject: Record<string, number> = {};
  for (const sub of params.subjects) {
    remainingCountBySubject[sub.subjectId] = 0;
  }

  let daysRemaining = 0;
  let holidaysCount = 0;
  let totalRemainingClasses = 0;

  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1); // start counting from tomorrow

  while (cursor <= semesterEnd) {
    const dateStr = toLocalDateStr(cursor);
    const dayOfWeek = cursor.getDay();
    daysRemaining++;

    if (holidayDateSet.has(dateStr)) {
      holidaysCount++;
    } else {
      // Find timetable slots for this day of week
      const daySlots = params.timetableSlots.filter((slot) => slot.dayOfWeek === dayOfWeek);
      for (const slot of daySlots) {
        const sId = slot.subjectId.toString();
        remainingCountBySubject[sId] = (remainingCountBySubject[sId] || 0) + 1;
        totalRemainingClasses++;
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  // Build predictions for each subject
  let totalCurrentAttended = 0;
  let totalCurrentConducted = 0;
  let totalSemesterConducted = 0;
  let totalClassesNeededOfRemaining = 0;

  const subjectPredictions: SubjectSemesterPrediction[] = params.subjects.map((sub) => {
    const remaining = remainingCountBySubject[sub.subjectId] || 0;
    const subTarget = sub.targetPercentage || target;
    const semConducted = sub.conducted + remaining;

    totalCurrentAttended += sub.attended;
    totalCurrentConducted += sub.conducted;
    totalSemesterConducted += semConducted;

    const maxAchievable =
      semConducted === 0 ? 100 : Number((((sub.attended + remaining) / semConducted) * 100).toFixed(1));
    const minAchievable =
      semConducted === 0 ? 100 : Number(((sub.attended / semConducted) * 100).toFixed(1));

    const canReach = maxAchievable >= subTarget;

    // Minimum needed of remaining to reach target
    let needed = 0;
    if (semConducted > 0) {
      const minAttendedForTarget = Math.ceil((subTarget * semConducted) / 100);
      needed = Math.max(0, minAttendedForTarget - sub.attended);
    }
    const classesNeededOfRemaining = Math.min(needed, remaining);
    const maxCanMissOfRemaining = canReach ? Math.max(0, remaining - classesNeededOfRemaining) : 0;

    totalClassesNeededOfRemaining += classesNeededOfRemaining;

    let predStatus: "Safe" | "AtRisk" | "CannotReachTarget" = "Safe";
    if (!canReach) {
      predStatus = "CannotReachTarget";
    } else if (remaining > 0 && classesNeededOfRemaining / remaining >= 0.75) {
      predStatus = "AtRisk";
    }

    return {
      subjectId: sub.subjectId,
      subjectCode: sub.subjectCode,
      subjectName: sub.subjectName,
      currentAttended: sub.attended,
      currentConducted: sub.conducted,
      currentPercentage: sub.percentage,
      targetPercentage: subTarget,
      remainingClasses: remaining,
      totalSemesterConducted: semConducted,
      maxAchievablePercentage: maxAchievable,
      minAttendancePercentage: minAchievable,
      canReachTarget: canReach,
      classesNeededOfRemaining,
      maxCanMissOfRemaining,
      status: predStatus,
    };
  });

  const currentOverallPercentage =
    totalCurrentConducted === 0
      ? 100
      : Number(((totalCurrentAttended / totalCurrentConducted) * 100).toFixed(1));

  const maxAchievableOverallPercentage =
    totalSemesterConducted === 0
      ? 100
      : Number((((totalCurrentAttended + totalRemainingClasses) / totalSemesterConducted) * 100).toFixed(1));

  const minOverallPercentage =
    totalSemesterConducted === 0
      ? 100
      : Number(((totalCurrentAttended / totalSemesterConducted) * 100).toFixed(1));

  const canReachOverallTarget = maxAchievableOverallPercentage >= target;
  const totalCanMissOfRemaining = canReachOverallTarget
    ? Math.max(0, totalRemainingClasses - totalClassesNeededOfRemaining)
    : 0;

  return {
    semesterEndDate: semesterEnd.toISOString().split("T")[0],
    daysRemaining,
    holidaysCount,
    totalRemainingClasses,
    totalSemesterConducted,
    currentOverallPercentage,
    maxAchievableOverallPercentage,
    minOverallPercentage,
    canReachOverallTarget,
    totalClassesNeededOfRemaining,
    totalCanMissOfRemaining,
    subjects: subjectPredictions,
  };
}
