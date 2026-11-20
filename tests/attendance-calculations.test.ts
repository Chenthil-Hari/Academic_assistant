import {
  calculateClassesNeeded,
  calculateMaxClassesCanMiss,
  calculateSubjectMetrics,
  calculateOverallMetrics,
  calculateSemesterPredictions,
} from "../src/lib/attendance/calculations";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("=== RUNNING ACADEMIC AI ATTENDANCE UNIT TESTS ===");

// TEST 1: Conducted formula & exclusion of cancelled/pending
// Conducted = Attended + Absent. Cancelled & Pending must not count towards conducted classes.
const metrics1 = calculateSubjectMetrics({
  subjectId: "sub-1",
  subjectCode: "DBMS",
  subjectName: "Database Management Systems",
  attended: 15,
  absent: 5,
  cancelled: 3, // Should NOT be in conducted
  pending: 2,   // Should NOT be in conducted
  targetPercentage: 75,
});

assert(metrics1.conducted === 20, `Expected conducted=20, got ${metrics1.conducted}`);
assert(metrics1.percentage === 75, `Expected percentage=75%, got ${metrics1.percentage}%`);
assert(metrics1.classesNeededForTarget === 0, `Expected 0 classes needed when exactly on target`);
assert(metrics1.maxClassesCanMiss === 0, `Expected 0 bunk buffer when exactly at 75% threshold`);
console.log("✓ Test 1 passed: Conducted = Attended + Absent (Cancelled & Pending excluded).");

// TEST 2: Bunk Buffer calculation (Safe Zone)
// Attended = 18, Conducted = 20 -> 90%. Target = 75%.
// Max can miss y: 18 / (20 + y) >= 0.75 => 0.75 * y <= 18 - 15 => y <= 3 / 0.75 = 4 classes!
const metrics2 = calculateSubjectMetrics({
  subjectId: "sub-2",
  subjectCode: "OS",
  subjectName: "Operating Systems",
  attended: 18,
  absent: 2,
  cancelled: 0,
  pending: 0,
  targetPercentage: 75,
});

assert(metrics2.percentage === 90, `Expected 90%, got ${metrics2.percentage}`);
assert(metrics2.maxClassesCanMiss === 4, `Expected 4 classes can be missed, got ${metrics2.maxClassesCanMiss}`);
assert(metrics2.classesNeededForTarget === 0, `Expected 0 classes needed`);
console.log("✓ Test 2 passed: Bunk buffer calculation accurately yields 4 classes for 90% attendance.");

// TEST 3: Classes Needed calculation (Deficit Zone)
// Attended = 10, Conducted = 20 -> 50%. Target = 75%.
// (10 + x) / (20 + x) >= 0.75 => 10 + x >= 15 + 0.75x => 0.25x >= 5 => x >= 20 consecutive classes!
const metrics3 = calculateSubjectMetrics({
  subjectId: "sub-3",
  subjectCode: "CN",
  subjectName: "Computer Networks",
  attended: 10,
  absent: 10,
  cancelled: 1,
  pending: 0,
  targetPercentage: 75,
});

assert(metrics3.percentage === 50, `Expected 50%, got ${metrics3.percentage}`);
assert(metrics3.classesNeededForTarget === 20, `Expected 20 classes needed, got ${metrics3.classesNeededForTarget}`);
assert(metrics3.maxClassesCanMiss === 0, `Expected 0 bunk buffer in deficit zone`);
console.log("✓ Test 3 passed: Classes required to reach 75% accurately computed as 20 consecutive classes.");

// TEST 4: Lowest Attendance Subject Detection
const overall = calculateOverallMetrics([metrics1, metrics2, metrics3], 75);
assert(overall.totalAttended === 43, `Expected totalAttended=43, got ${overall.totalAttended}`);
assert(overall.totalConducted === 60, `Expected totalConducted=60, got ${overall.totalConducted}`);
assert(overall.lowestAttendanceSubject?.subjectCode === "CN", `Expected lowest subject to be CN, got ${overall.lowestAttendanceSubject?.subjectCode}`);
assert(overall.lowestAttendanceSubject?.percentage === 50, `Expected lowest pct to be 50, got ${overall.lowestAttendanceSubject?.percentage}`);
console.log("✓ Test 4 passed: Lowest attendance subject correctly identified as CN at 50%.");

// TEST 5: End-of-Semester Attendance Predictor
// Subject: DBMS has 15 attended, 20 conducted (75%).
// Suppose 10 remaining classes are scheduled before semester end.
// Total semester conducted will be 20 + 10 = 30.
// Max achievable if 100% attended: (15 + 10) / 30 = 25 / 30 = 83.3%.
// Min if 0% attended: 15 / 30 = 50.0%.
// Target = 75% -> min attended needed in semester: ceil(0.75 * 30) = 23.
// Classes needed of remaining: 23 - 15 = 8 classes.
// Max classes can miss of remaining: 10 - 8 = 2 classes!
const fakeStartDate = new Date("2026-11-20");
const predictions = calculateSemesterPredictions({
  subjects: [metrics1],
  timetableSlots: [
    { subjectId: "sub-1", dayOfWeek: 1 }, // Monday
    { subjectId: "sub-1", dayOfWeek: 3 }, // Wednesday
  ],
  academicEvents: [
    { type: "SemesterEnd", date: new Date("2026-12-25") },
    { type: "Holiday", date: new Date("2026-11-23"), isHoliday: true }, // Monday Nov 23 holiday
  ],
  targetPercentage: 75,
  startDate: fakeStartDate,
});

const subPred = predictions.subjects[0];
assert(subPred.remainingClasses === 9, `Expected remainingClasses=9, got ${subPred.remainingClasses}`);
assert(subPred.maxAchievablePercentage === 82.8, `Expected maxAchievable=82.8%, got ${subPred.maxAchievablePercentage}%`);
assert(subPred.canReachTarget === true, `Expected canReachTarget=true`);
console.log(`✓ Test 5 passed: End-of-Semester prediction accurately computes remaining classes (${subPred.remainingClasses}), max achievable (${subPred.maxAchievablePercentage}%), and remaining miss buffer (${subPred.maxCanMissOfRemaining}).`);

console.log("\nALL ATTENDANCE ENGINE UNIT TESTS PASSED SUCCESSFULLY! (5/5)\n");
