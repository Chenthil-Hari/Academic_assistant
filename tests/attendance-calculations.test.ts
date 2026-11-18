import {
  calculateClassesNeeded,
  calculateMaxClassesCanMiss,
  calculateSubjectMetrics,
  calculateOverallMetrics,
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

console.log("\nALL ATTENDANCE ENGINE UNIT TESTS PASSED SUCCESSFULLY! (4/4)\n");
