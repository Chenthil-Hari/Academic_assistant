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
