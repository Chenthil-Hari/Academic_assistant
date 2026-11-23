export interface InitialGateSubjectData {
  name: string;
  code: string;
  remainingVideos: number;
  averageVideoDuration: number;
  priority: "High" | "Medium" | "Low";
  priorityOrder: number;
  color: string;
}

export const INITIAL_GATE_SUBJECTS: InitialGateSubjectData[] = [
  {
    name: "Data Structures & Programming",
    code: "DS_PROG",
    remainingVideos: 8,
    averageVideoDuration: 1.5,
    priority: "High",
    priorityOrder: 1,
    color: "#3B82F6", // blue
  },
  {
    name: "Algorithms",
    code: "ALGO",
    remainingVideos: 44,
    averageVideoDuration: 1.5,
    priority: "High",
    priorityOrder: 2,
    color: "#10B981", // emerald
  },
  {
    name: "DBMS",
    code: "DBMS",
    remainingVideos: 37,
    averageVideoDuration: 1.5,
    priority: "High",
    priorityOrder: 3,
    color: "#6366F1", // indigo
  },
  {
    name: "Operating Systems",
    code: "OS",
    remainingVideos: 28,
    averageVideoDuration: 1.5,
    priority: "High",
    priorityOrder: 4,
    color: "#EC4899", // pink
  },
  {
    name: "Computer Networks",
    code: "CN",
    remainingVideos: 60,
    averageVideoDuration: 2.0,
    priority: "High",
    priorityOrder: 5,
    color: "#8B5CF6", // purple
  },
  {
    name: "Computer Organization and Architecture",
    code: "COA",
    remainingVideos: 33,
    averageVideoDuration: 1.5,
    priority: "High",
    priorityOrder: 6,
    color: "#F59E0B", // amber
  },
  {
    name: "Theory of Computation",
    code: "TOC",
    remainingVideos: 8,
    averageVideoDuration: 1.5,
    priority: "High",
    priorityOrder: 7,
    color: "#06B6D4", // cyan
  },
  {
    name: "Discrete Mathematics",
    code: "DM",
    remainingVideos: 39,
    averageVideoDuration: 1.0,
    priority: "High",
    priorityOrder: 8,
    color: "#14B8A6", // teal
  },
  {
    name: "Engineering Mathematics",
    code: "EM",
    remainingVideos: 76,
    averageVideoDuration: 1.75,
    priority: "High",
    priorityOrder: 9,
    color: "#F97316", // orange
  },
  {
    name: "Digital Logic",
    code: "DL",
    remainingVideos: 43,
    averageVideoDuration: 1.5,
    priority: "High",
    priorityOrder: 10,
    color: "#E11D48", // rose
  },
  {
    name: "General Aptitude",
    code: "GA",
    remainingVideos: 24,
    averageVideoDuration: 1.5,
    priority: "High",
    priorityOrder: 11,
    color: "#84CC16", // lime
  },
  {
    name: "Compiler Design",
    code: "CD",
    remainingVideos: 9,
    averageVideoDuration: 1.5,
    priority: "Low", // Deprioritized
    priorityOrder: 12,
    color: "#64748B", // slate
  },
  {
    name: "C Programming",
    code: "C_PROG",
    remainingVideos: 14,
    averageVideoDuration: 1.5,
    priority: "Low", // Deprioritized
    priorityOrder: 13,
    color: "#A855F7", // violet
  },
  {
    name: "Verbal Aptitude",
    code: "VA",
    remainingVideos: 7,
    averageVideoDuration: 1.5,
    priority: "Low", // Deprioritized
    priorityOrder: 14,
    color: "#94A3B8", // gray
  },
];

export interface SubjectWorkloadMetrics {
  id: string;
  name: string;
  code: string;
  priority: "High" | "Medium" | "Low";
  priorityOrder: number;
  initialVideos: number;
  remainingVideos: number;
  completedVideos: number;
  averageVideoDuration: number;
  remainingHours: number;
  completedHours: number;
  completionPercentage: number;
  color: string;
  status: "Not Started" | "In Progress" | "Completed";
  estimatedCompletionDate?: string;
}

export interface GateMotivation {
  quote: string;
  author: string;
  tag: string;
  actionTip: string;
}

export const GATE_MOTIVATION_QUOTES: GateMotivation[] = [
  {
    quote: "Top IITs and IISc do not demand genius; they demand consistent, unyielding daily discipline. 10 focused hours today buys your seat in the master's program of your dreams.",
    author: "AIR 1 Mindset",
    tag: "Consistency",
    actionTip: "Complete your scheduled 4-hour morning deep focus block without touching your phone.",
  },
  {
    quote: "GATE is not a test of memorization, but a test of conceptual clarity. When your fundamentals in Data Structures, OS, and Algorithms are rock-solid, every question unfolds naturally.",
    author: "Conceptual Mastery",
    tag: "Fundamentals",
    actionTip: "Focus on understanding the 'why' behind algorithmic complexities rather than just mugging up formulas.",
  },
  {
    quote: "Every video lecture watched, every concept noted, and every test analyzed is an irreversible deposit into your AIR < 100 bank account.",
    author: "IIT Dreamer",
    tag: "Daily Progress",
    actionTip: "Don't measure progress by exhaustion; measure it by clarity gained in today's subject.",
  },
  {
    quote: "The pain of waking up early and studying 10 hours today is nothing compared to the regret of missing your dream IIT cutoff by 2 marks. Push through today's resistance.",
    author: "Relentless Focus",
    tag: "Discipline",
    actionTip: "When you feel like quitting early, remember: your competitors are still studying right now.",
  },
  {
    quote: "Phase 1 builds your impenetrable conceptual armor; Phase 2 sharpens your PYQ sword. Trust the timeline, follow the schedule, and conquer the syllabus.",
    author: "Strategic Execution",
    tag: "Roadmap",
    actionTip: "Stick to High-Priority subjects first. Mastering 85% of high-yield topics beats skimming 100% of everything.",
  },
  {
    quote: "Discipline is choosing between what you want right now and what you want most in life. The gates of IIT Bombay, IIT Madras, and IISc are waiting for you.",
    author: "Future M.Tech Scholar",
    tag: "Vision",
    actionTip: "Write down your target rank on your desk and give your 100% to today's study blocks.",
  },
  {
    quote: "Mistakes made in your notes and practice tests are goldmines. Every error you catch and document now is one less trap you'll fall into on exam day.",
    author: "Accuracy Engineering",
    tag: "Mistake Notebook",
    actionTip: "Log any tricky question or misunderstanding immediately in your GATE Mistake Notebook.",
  },
  {
    quote: "Small disciplines repeated with unwavering consistency every single day lead to monumental achievements in February. Make today count.",
    author: "GATE 2027 Aspirant",
    tag: "Daily Habit",
    actionTip: "Log today's completed lecture videos in the Daily Tracker before you sleep.",
  },
  {
    quote: "One subject, one lecture, one problem at a time. The mountain seems high, but step by step you are already climbing faster than 99% of aspirants.",
    author: "Unstoppable Momentum",
    tag: "Focus",
    actionTip: "Avoid multitasking. Dedicate full focus to your current lecture block.",
  },
];

export interface WorkloadOverview {
  totalInitialVideos: number;
  totalRemainingVideos: number;
  totalCompletedVideos: number;
  totalRemainingHours: number;
  totalCompletedHours: number;
  overallCompletionPercentage: number;
  daysRemainingUntilDeadline: number;
  daysRemainingUntilGateExam: number;
  gateExamDate: string;
  motivation: GateMotivation;
  effectiveStudyDays: number;
  totalAvailableStudyHours: number;
  dailyRequiredLectureHours: number;
  workloadGapHours: number; // positive = deficit (need more hours than available)
  isFeasibleByDeadline: boolean;
  feasibilityVerdict: string;
  recommendations: string[];
  highPriorityRemainingHours: number;
  mediumPriorityRemainingHours: number;
  lowPriorityRemainingHours: number;
  subjects: SubjectWorkloadMetrics[];
}

/**
 * Calculates detailed workload metrics and deadline feasibility
 */
export function calculateGateWorkload(params: {
  subjects: any[];
  deadline?: Date;
  gateExamDate?: Date;
  dailyStudyHours?: number;
  studyDaysPerWeek?: number;
  playbackSpeed?: number;
  currentDate?: Date;
}): WorkloadOverview {
  const {
    subjects,
    deadline = new Date("2026-12-31T23:59:59.999Z"),
    gateExamDate = new Date("2027-02-06T09:00:00.000Z"),
    dailyStudyHours = 10,
    studyDaysPerWeek = 6,
    playbackSpeed = 1.0,
    currentDate = new Date(),
  } = params;

  let totalInitialVideos = 0;
  let totalRemainingVideos = 0;
  let totalCompletedVideos = 0;
  let totalRemainingHours = 0;
  let totalCompletedHours = 0;
  let highPriorityRemainingHours = 0;
  let mediumPriorityRemainingHours = 0;
  let lowPriorityRemainingHours = 0;

  const subjectMetrics: SubjectWorkloadMetrics[] = subjects.map((sub) => {
    const initV = Number(sub.initialVideos) || Number(sub.remainingVideos) || 0;
    const remV = Math.max(0, Number(sub.remainingVideos) || 0);
    const compV = Math.max(0, Number(sub.completedVideos) || Math.max(0, initV - remV));
    const avgDur = Number(sub.averageVideoDuration) || 1.5;

    // Adjust remaining hours by playback speed if set
    const effDur = avgDur / Math.max(0.5, playbackSpeed);
    const remH = Number((remV * effDur).toFixed(2));
    const compH = Number((compV * effDur).toFixed(2));
    const pct = initV > 0 ? Number(((compV / initV) * 100).toFixed(1)) : 100;

    totalInitialVideos += initV;
    totalRemainingVideos += remV;
    totalCompletedVideos += compV;
    totalRemainingHours += remH;
    totalCompletedHours += compH;

    const pri = (sub.priority || "High") as "High" | "Medium" | "Low";
    if (pri === "High") highPriorityRemainingHours += remH;
    else if (pri === "Medium") mediumPriorityRemainingHours += remH;
    else lowPriorityRemainingHours += remH;

    let status = sub.status || "In Progress";
    if (remV === 0) status = "Completed";
    else if (compV === 0) status = "Not Started";

    return {
      id: sub._id ? sub._id.toString() : sub.id || sub.code,
      name: sub.name,
      code: sub.code,
      priority: pri,
      priorityOrder: Number(sub.priorityOrder) || 99,
      initialVideos: initV,
      remainingVideos: remV,
      completedVideos: compV,
      averageVideoDuration: avgDur,
      remainingHours: remH,
      completedHours: compH,
      completionPercentage: pct,
      color: sub.color || "#3B82F6",
      status,
    };
  });

  // Calculate calendar days & effective study days (excluding Sundays / rest days)
  const now = new Date(currentDate);
  now.setHours(0, 0, 0, 0);
  const end = new Date(deadline);
  end.setHours(23, 59, 59, 999);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / msPerDay));

  let effectiveStudyDays = 0;
  for (let d = 0; d < daysDiff; d++) {
    const cur = new Date(now.getTime() + d * msPerDay);
    if (cur.getDay() !== 0) {
      // Not Sunday (Sunday is reserved for rest & optional revision)
      effectiveStudyDays++;
    }
  }

  const totalAvailableStudyHours = effectiveStudyDays * dailyStudyHours;
  const workloadGapHours = Number((totalRemainingHours - totalAvailableStudyHours).toFixed(2));
  const isFeasibleByDeadline = workloadGapHours <= 0;
  const dailyRequiredLectureHours =
    effectiveStudyDays > 0 ? Number((totalRemainingHours / effectiveStudyDays).toFixed(2)) : 0;
  const overallCompletionPercentage =
    totalInitialVideos > 0
      ? Number(((totalCompletedVideos / totalInitialVideos) * 100).toFixed(1))
      : 0;

  // Realistic recommendations based on mathematical workload gap
  const recommendations: string[] = [];
  let feasibilityVerdict = "";

  if (isFeasibleByDeadline) {
    feasibilityVerdict = `✅ On Track: You have ${totalAvailableStudyHours} study hours available vs ${totalRemainingHours.toFixed(1)} remaining lecture hours.`;
    recommendations.push(
      "Maintain your steady 10 hours/day schedule. Reserve Sundays for active recall and revision.",
      "High-priority subjects will finish comfortably before the December 31 deadline.",
      "You will be ready to transition directly into Phase 2 (PYQ Practice) on January 1, 2027!"
    );
  } else {
    feasibilityVerdict = `⚠️ Workload Deficit of ${workloadGapHours.toFixed(1)} Hours: ${totalRemainingHours.toFixed(1)} total lecture hours needed, but only ${totalAvailableStudyHours} effective hours available (at 10h/day for ${effectiveStudyDays} study days).`;

    recommendations.push(
      `🎯 Priority Focus: High-Priority subjects require ${highPriorityRemainingHours.toFixed(1)} hours. Completing High-Priority subjects first ensures core scoring coverage before Dec 31.`,
      `⏩ Playback Acceleration: Watching lectures at 1.25x reduces required time to ${(totalRemainingHours / 1.25).toFixed(1)} hrs (saving ${(totalRemainingHours - totalRemainingHours / 1.25).toFixed(1)} hrs); 1.5x reduces it to ${(totalRemainingHours / 1.5).toFixed(1)} hrs.`,
      `📦 Defer Low-Priority Subjects: Deprioritized subjects (Compiler Design, separate C Programming, Verbal Aptitude) account for ${lowPriorityRemainingHours.toFixed(1)} hours. Deferring them to January allows you to complete the core syllabus easily.`,
      `⚡ Daily Target: To finish ALL remaining lectures by Dec 31, you would need ${dailyRequiredLectureHours.toFixed(1)} hours/day (exceeding your 10h/day cap). Sticking strictly to High-Priority subjects requires ${(highPriorityRemainingHours / (effectiveStudyDays || 1)).toFixed(1)} hours/day, which is well within your 10h budget!`
    );
  }

  // Calculate estimated completion dates per subject
  // Sort subjects by priorityOrder & allocate available hours in sequence
  const sorted = [...subjectMetrics].sort((a, b) => a.priorityOrder - b.priorityOrder);
  let accumulatedHours = 0;
  for (const s of sorted) {
    accumulatedHours += s.remainingHours;
    const daysNeeded = Math.ceil(accumulatedHours / dailyStudyHours);
    // Find calendar date factoring in Sundays
    let addedStudyDays = 0;
    let testDate = new Date(now);
    while (addedStudyDays < daysNeeded) {
      testDate = new Date(testDate.getTime() + msPerDay);
      if (testDate.getDay() !== 0) addedStudyDays++;
    }
    s.estimatedCompletionDate = testDate.toISOString().split("T")[0];
  }

  // Calculate days until GATE Exam
  const examDate = new Date(gateExamDate);
  examDate.setHours(23, 59, 59, 999);
  const daysRemainingUntilGateExam = Math.max(0, Math.ceil((examDate.getTime() - now.getTime()) / msPerDay));

  // Daily motivation calculation (rotates daily based on day of year)
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / msPerDay);
  const motivationIndex = Math.abs(dayOfYear) % GATE_MOTIVATION_QUOTES.length;
  const motivation = GATE_MOTIVATION_QUOTES[motivationIndex];

  return {
    totalInitialVideos,
    totalRemainingVideos,
    totalCompletedVideos,
    totalRemainingHours: Number(totalRemainingHours.toFixed(2)),
    totalCompletedHours: Number(totalCompletedHours.toFixed(2)),
    overallCompletionPercentage,
    daysRemainingUntilDeadline: daysDiff,
    daysRemainingUntilGateExam,
    gateExamDate: examDate.toISOString().split("T")[0],
    motivation,
    effectiveStudyDays,
    totalAvailableStudyHours,
    dailyRequiredLectureHours,
    workloadGapHours,
    isFeasibleByDeadline,
    feasibilityVerdict,
    recommendations,
    highPriorityRemainingHours: Number(highPriorityRemainingHours.toFixed(2)),
    mediumPriorityRemainingHours: Number(mediumPriorityRemainingHours.toFixed(2)),
    lowPriorityRemainingHours: Number(lowPriorityRemainingHours.toFixed(2)),
    subjects: subjectMetrics,
  };
}
