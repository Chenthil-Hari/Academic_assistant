import connectToDatabase from "@/lib/db/connection";
import { Subject } from "@/lib/db/models/Subject";
import { Timetable } from "@/lib/db/models/Timetable";
import { Attendance } from "@/lib/db/models/Attendance";
import { AcademicEvent } from "@/lib/db/models/AcademicEvent";
import { User } from "@/lib/db/models/User";
import {
  calculateSubjectMetrics,
  calculateOverallMetrics,
  calculateClassesNeeded,
  calculateMaxClassesCanMiss,
  calculateSemesterPredictions,
} from "@/lib/attendance/calculations";
import mongoose from "mongoose";

export const AI_TOOLS_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "get_user_profile",
      description: "Retrieve the student's personal profile, identity, and account details from the website, including full name, email, college/university, department/branch, current semester, roll number, target attendance percentage, and notification preferences (Telegram, Web Push, daily check-in time).",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_academic_dashboard_overview",
      description: "Retrieve a complete 360-degree summary of all student details and academic information from the website: student profile (name, roll no, college, branch, semester), overall attendance and status, enrolled subjects count, today's schedule, uploaded documents, and upcoming events.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_enrolled_subjects",
      description: "Retrieve all registered/enrolled subjects for the student, including course codes, names, credits, faculty/instructors, minimum attendance thresholds, and total credits.",
      parameters: {
        type: "object",
        properties: {
          subjectCodeOrName: {
            type: "string",
            description: "Optional subject code or name to look up a specific subject.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_schedule_for_day",
      description: "Get the student's class schedule for any specific day of the week ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') or relative day ('today', 'tomorrow', 'yesterday') or exact date ('YYYY-MM-DD'). Shows class times, subject codes, rooms, and whether it's a holiday.",
      parameters: {
        type: "object",
        properties: {
          dayOrDate: {
            type: "string",
            description: "The day to check: 'today', 'tomorrow', 'yesterday', a day of week like 'Monday', 'Friday', or an ISO date 'YYYY-MM-DD'. Defaults to 'today'.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_today_schedule",
      description: "Get the authenticated user's classes scheduled for today (or specified day/date), including times, subjects, rooms, current running class, and next class.",
      parameters: {
        type: "object",
        properties: {
          dayOrDate: {
            type: "string",
            description: "Optional day of week ('Monday', etc.) or 'today', 'tomorrow', 'yesterday'. Defaults to 'today'.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_subject_attendance",
      description: "Get attendance statistics (percentage, conducted, attended, absent, safe/warning status) for a specific subject or all subjects.",
      parameters: {
        type: "object",
        properties: {
          subjectNameOrCode: {
            type: "string",
            description: "Subject code or name (e.g., 'DBMS', 'CS101', 'Math'). If omitted, returns all subjects.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_bunk_and_targets",
      description: "Calculate how many classes a user can safely miss or how many they must attend to reach a target attendance percentage.",
      parameters: {
        type: "object",
        properties: {
          subjectNameOrCode: {
            type: "string",
            description: "Subject code or name. If omitted, calculates for overall attendance.",
          },
          targetPercentage: {
            type: "number",
            description: "Target attendance percentage (e.g. 75, 80). If omitted, uses user's configured target.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_lowest_attendance_subject",
      description: "Identify the subject that currently has the lowest attendance percentage.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_upcoming_academic_events",
      description: "Retrieve upcoming exams, assignment deadlines, holidays (e.g. Pongal, Diwali, National Holidays), or search for a specific holiday/exam by name.",
      parameters: {
        type: "object",
        properties: {
          searchTerm: {
            type: "string",
            description: "Keyword or holiday name to search for (e.g. 'Pongal', 'Diwali', 'Midterm', 'Semester End', 'Christmas').",
          },
          daysAhead: {
            type: "number",
            description: "Number of days in future to look for events (default 180).",
          },
          eventType: {
            type: "string",
            enum: ["Exam", "Assignment", "Holiday", "Event", "All"],
            description: "Filter by type of event.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_weekly_timetable",
      description: "Retrieve the full weekly timetable schedule of classes for all days (Monday through Saturday).",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "predict_semester_attendance",
      description: "Predict end-of-semester attendance by cross-referencing current attendance, weekly timetable slots, and remaining academic calendar days & holidays. Calculates maximum achievable percentage if student attends 100% of remaining classes, minimum percentage if 0% attended, and how many remaining classes must be attended or can safely be missed.",
      parameters: {
        type: "object",
        properties: {
          subjectNameOrCode: {
            type: "string",
            description: "Optional subject code or name (e.g. 'DBMS', 'CN') to predict for a specific subject. If omitted, predicts for all subjects and overall attendance.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_uploaded_document_details",
      description: "Retrieve details and raw text extracted from the user's uploaded academic PDFs (timetables, academic calendars, syllabus), including filenames, detected subjects, and schedule content.",
      parameters: {
        type: "object",
        properties: {
          documentType: {
            type: "string",
            enum: ["timetable_pdf", "academic_calendar_pdf", "all"],
            description: "Optional filter for type of uploaded document.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_attendance_history_or_records",
      description: "Retrieve specific attendance log records, check-in history, or check attendance for a particular date ('today', 'yesterday', or specific date) or subject.",
      parameters: {
        type: "object",
        properties: {
          subjectNameOrCode: {
            type: "string",
            description: "Filter by subject code or name.",
          },
          date: {
            type: "string",
            description: "Filter by date: 'today', 'yesterday', or 'YYYY-MM-DD'.",
          },
          status: {
            type: "string",
            enum: ["Attended", "Absent", "Cancelled", "Pending", "All"],
            description: "Filter by attendance status.",
          },
          limit: {
            type: "number",
            description: "Max number of records to return (default 20).",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "mark_attendance_checkin",
      description: "Perform daily check-in or mark classes for today as Attended or Absent. Actions: 'mark_all_attended', 'mark_all_absent', or 'get_checkin_status'.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["mark_all_attended", "mark_all_absent", "get_checkin_status"],
            description: "Action to perform for today's classes.",
          },
        },
      },
    },
  },
];

function resolveTargetDateAndDay(input?: string): {
  targetDate: Date;
  dayOfWeek: number;
  dayName: string;
  isToday: boolean;
  dateStr: string;
} {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const nowUtc = new Date();
  const todayIst = new Date(nowUtc.getTime() + istOffset);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayStr = todayIst.toISOString().split("T")[0];

  if (!input || input.trim().toLowerCase() === "today") {
    return {
      targetDate: todayIst,
      dayOfWeek: todayIst.getUTCDay(),
      dayName: dayNames[todayIst.getUTCDay()],
      isToday: true,
      dateStr: todayStr,
    };
  }

  const clean = input.trim().toLowerCase();
  if (clean === "tomorrow") {
    const tomorrowIst = new Date(todayIst.getTime() + 24 * 60 * 60 * 1000);
    return {
      targetDate: tomorrowIst,
      dayOfWeek: tomorrowIst.getUTCDay(),
      dayName: dayNames[tomorrowIst.getUTCDay()],
      isToday: false,
      dateStr: tomorrowIst.toISOString().split("T")[0],
    };
  }

  if (clean === "yesterday") {
    const yesterdayIst = new Date(todayIst.getTime() - 24 * 60 * 60 * 1000);
    return {
      targetDate: yesterdayIst,
      dayOfWeek: yesterdayIst.getUTCDay(),
      dayName: dayNames[yesterdayIst.getUTCDay()],
      isToday: false,
      dateStr: yesterdayIst.toISOString().split("T")[0],
    };
  }

  const dayIdx = dayNames.findIndex((d) => d.toLowerCase() === clean);
  if (dayIdx !== -1) {
    let daysToAdd = (dayIdx - todayIst.getUTCDay() + 7) % 7;
    const resolvedDate = new Date(todayIst.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return {
      targetDate: resolvedDate,
      dayOfWeek: dayIdx,
      dayName: dayNames[dayIdx],
      isToday: daysToAdd === 0,
      dateStr: resolvedDate.toISOString().split("T")[0],
    };
  }

  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    const parsedIst = new Date(parsed.getTime() + istOffset);
    const pStr = parsedIst.toISOString().split("T")[0];
    return {
      targetDate: parsedIst,
      dayOfWeek: parsedIst.getUTCDay(),
      dayName: dayNames[parsedIst.getUTCDay()],
      isToday: pStr === todayStr,
      dateStr: pStr,
    };
  }

  return {
    targetDate: todayIst,
    dayOfWeek: todayIst.getUTCDay(),
    dayName: dayNames[todayIst.getUTCDay()],
    isToday: true,
    dateStr: todayStr,
  };
}

/**
 * Executes a deterministic tool call against MongoDB with authenticated user isolation
 */
export async function executeAiTool(
  toolName: string,
  args: any,
  userId: string
): Promise<any> {
  await connectToDatabase();
  const userObjectId = new mongoose.Types.ObjectId(userId);

  switch (toolName) {
    case "get_user_profile": {
      const user = await User.findById(userObjectId);
      if (!user) return { error: "User profile not found." };
      return {
        name: user.name,
        email: user.email,
        college: user.college || "Amrita Vishwa Vidhyapeetham",
        branch: user.branch || "Computer Science",
        semester: user.semester || 6,
        rollNumber: user.rollNumber || "CH.SC.U4CSE4103",
        targetAttendancePercentage: user.targetAttendancePercentage || 75,
        notificationPreferences: {
          webPush: user.notificationPreferences?.webPush ?? true,
          telegram: user.notificationPreferences?.telegram ?? true,
          dailyCheckinTime: user.notificationPreferences?.dailyCheckinTime || "16:00",
          timezone: user.notificationPreferences?.timezone || "Asia/Kolkata",
        },
        telegramConnected: Boolean(user.telegramChatId),
        telegramChatId: user.telegramChatId || "",
        accountCreatedAt: user.createdAt?.toISOString().split("T")[0] || "",
      };
    }

    case "get_academic_dashboard_overview": {
      const user = await User.findById(userObjectId);
      const subjects = await Subject.find({ userId: userObjectId }).sort({ code: 1 });
      const totalCredits = subjects.reduce((sum, s) => sum + (s.credit || 0), 0);
      const defaultTarget = user?.targetAttendancePercentage || 75;

      const attendanceAgg = await Attendance.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: { subjectId: "$subjectId", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ]);

      const countMap: Record<string, number> = {};
      for (const row of attendanceAgg) {
        if (row._id?.subjectId && row._id?.status) {
          countMap[`${row._id.subjectId.toString()}_${row._id.status}`] = row.count;
        }
      }

      let totalAttended = 0;
      let totalAbsent = 0;
      const subjectMetrics = subjects.map((sub) => {
        const subId = sub._id.toString();
        const attended = countMap[`${subId}_Attended`] || 0;
        const absent = countMap[`${subId}_Absent`] || 0;
        const conducted = attended + absent;
        const percentage = conducted === 0 ? 100 : Number(((attended / conducted) * 100).toFixed(1));
        totalAttended += attended;
        totalAbsent += absent;
        return {
          code: sub.code,
          name: sub.name,
          credit: sub.credit,
          faculty: sub.faculty || "Not assigned",
          attended,
          conducted,
          percentage,
          status: percentage >= (sub.minAttendanceThreshold || defaultTarget) ? "Safe" : "Warning",
        };
      });

      const totalConducted = totalAttended + totalAbsent;
      const overallPercentage = totalConducted === 0 ? 100 : Number(((totalAttended / totalConducted) * 100).toFixed(1));

      // Today's classes
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(Date.now() + istOffset);
      const dayOfWeek = istDate.getUTCDay();
      const slots = await Timetable.find({ userId: userObjectId, dayOfWeek, isActive: true })
        .populate("subjectId", "code name room")
        .sort({ "timeSlot.startTime": 1 });

      // Upcoming holiday/exam
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextEvent = await AcademicEvent.findOne({ userId: userObjectId, date: { $gte: today } }).sort({ date: 1 });

      return {
        profile: {
          name: user?.name,
          email: user?.email,
          college: user?.college || "Amrita Vishwa Vidhyapeetham",
          branch: user?.branch || "Computer Science",
          semester: user?.semester || 6,
          rollNumber: user?.rollNumber || "CH.SC.U4CSE4103",
          targetAttendancePercentage: defaultTarget,
          telegramConnected: Boolean(user?.telegramChatId),
        },
        enrolment: {
          totalSubjects: subjects.length,
          totalCredits,
          subjects: subjects.map((s) => `${s.code} - ${s.name} (${s.credit} credits)`),
        },
        attendance: {
          overallPercentage,
          totalConducted,
          totalAttended,
          totalAbsent,
          targetPercentage: defaultTarget,
          status: overallPercentage >= defaultTarget ? "Safe" : "Warning",
          subjectBreakdown: subjectMetrics,
        },
        todaySchedule: {
          totalClasses: slots.length,
          classes: slots.map((s: any) => ({
            code: s.subjectId?.code || "Unknown",
            name: s.subjectId?.name || "Unknown",
            time: `${s.timeSlot.startTime} - ${s.timeSlot.endTime}`,
            room: s.room || "TBA",
          })),
        },
        nextEvent: nextEvent
          ? {
              title: nextEvent.title,
              date: nextEvent.date.toISOString().split("T")[0],
              isHoliday: nextEvent.isHoliday,
              type: nextEvent.type,
            }
          : null,
      };
    }

    case "get_enrolled_subjects": {
      const subjects = await Subject.find({ userId: userObjectId }).sort({ code: 1 });
      const totalCredits = subjects.reduce((sum, s) => sum + (s.credit || 0), 0);

      if (args?.subjectCodeOrName) {
        const query = args.subjectCodeOrName.toLowerCase().trim();
        const matched = subjects.filter(
          (s) => s.code.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)
        );
        return {
          totalSubjects: subjects.length,
          matchedCount: matched.length,
          subjects: matched.map((s) => ({
            code: s.code,
            name: s.name,
            credit: s.credit,
            faculty: s.faculty || "Not assigned",
            minAttendanceThreshold: s.minAttendanceThreshold || 75,
            color: s.color,
          })),
        };
      }

      return {
        totalSubjects: subjects.length,
        totalCredits,
        subjects: subjects.map((s) => ({
          code: s.code,
          name: s.name,
          credit: s.credit,
          faculty: s.faculty || "Not assigned",
          minAttendanceThreshold: s.minAttendanceThreshold || 75,
          color: s.color,
        })),
      };
    }

    case "get_schedule_for_day":
    case "get_today_schedule": {
      const resolved = resolveTargetDateAndDay(args?.dayOrDate);
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(Date.now() + istOffset);
      const hours = String(istDate.getUTCHours()).padStart(2, "0");
      const minutes = String(istDate.getUTCMinutes()).padStart(2, "0");
      const currentTimeIST = `${hours}:${minutes}`;

      // Check for holiday
      const startOfDay = new Date(resolved.targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(resolved.targetDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const holiday = await AcademicEvent.findOne({
        userId: userObjectId,
        isHoliday: true,
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      if (holiday) {
        return {
          day: resolved.dayName,
          date: resolved.dateStr,
          isToday: resolved.isToday,
          isHoliday: true,
          holidayTitle: holiday.title,
          currentTimeIST: resolved.isToday ? currentTimeIST : undefined,
          message: `${resolved.isToday ? "Today" : resolved.dayName} is an academic holiday: "${holiday.title}". No regular classes scheduled.`,
        };
      }

      const slots = await Timetable.find({
        userId: userObjectId,
        dayOfWeek: resolved.dayOfWeek,
        isActive: true,
      })
        .populate("subjectId", "code name color room faculty")
        .sort({ "timeSlot.startTime": 1 });

      const currentSlot = resolved.isToday
        ? slots.find((s: any) => s.timeSlot.startTime <= currentTimeIST && s.timeSlot.endTime >= currentTimeIST)
        : null;
      const nextSlot = resolved.isToday
        ? slots.find((s: any) => s.timeSlot.startTime > currentTimeIST)
        : null;

      return {
        day: resolved.dayName,
        date: resolved.dateStr,
        isToday: resolved.isToday,
        currentTimeIST: resolved.isToday ? currentTimeIST : undefined,
        currentClass: currentSlot
          ? {
              code: (currentSlot as any).subjectId?.code || "Unknown",
              name: (currentSlot as any).subjectId?.name || "Unknown",
              time: `${currentSlot.timeSlot.startTime} - ${currentSlot.timeSlot.endTime}`,
              room: currentSlot.room || "TBA",
              type: currentSlot.type,
            }
          : null,
        nextClass: nextSlot
          ? {
              code: (nextSlot as any).subjectId?.code || "Unknown",
              name: (nextSlot as any).subjectId?.name || "Unknown",
              time: `${nextSlot.timeSlot.startTime} - ${nextSlot.timeSlot.endTime}`,
              room: nextSlot.room || "TBA",
              type: nextSlot.type,
            }
          : null,
        totalClasses: slots.length,
        classes: slots.map((s: any) => ({
          subjectCode: s.subjectId?.code || "Unknown",
          subjectName: s.subjectId?.name || "Unknown",
          time: `${s.timeSlot.startTime} - ${s.timeSlot.endTime}`,
          room: s.room || "TBA",
          type: s.type,
          faculty: s.subjectId?.faculty || "",
        })),
      };
    }

    case "get_attendance_history_or_records": {
      const query: any = { userId: userObjectId };

      if (args?.status && args.status !== "All") {
        query.status = args.status;
      }

      if (args?.subjectNameOrCode) {
        const subQuery = args.subjectNameOrCode.toLowerCase().trim();
        const matchingSubjects = await Subject.find({
          userId: userObjectId,
          $or: [
            { code: { $regex: subQuery, $options: "i" } },
            { name: { $regex: subQuery, $options: "i" } },
          ],
        }).select("_id");
        query.subjectId = { $in: matchingSubjects.map((s) => s._id) };
      }

      if (args?.date) {
        const istOffset = 5.5 * 60 * 60 * 1000;
        const nowUtc = new Date();
        const todayIst = new Date(nowUtc.getTime() + istOffset);
        let targetDate = todayIst;

        const dStr = args.date.trim().toLowerCase();
        if (dStr === "yesterday") {
          targetDate = new Date(todayIst.getTime() - 24 * 60 * 60 * 1000);
        } else if (dStr !== "today") {
          const p = new Date(args.date);
          if (!isNaN(p.getTime())) targetDate = p;
        }

        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.date = { $gte: startOfDay, $lte: endOfDay };
      }

      const limit = Number(args?.limit) || 20;
      const records = await Attendance.find(query)
        .populate("subjectId", "code name")
        .sort({ date: -1, markedAt: -1 })
        .limit(limit);

      return {
        count: records.length,
        records: records.map((r: any) => ({
          date: r.date?.toISOString().split("T")[0],
          subjectCode: r.subjectId?.code || "Unknown",
          subjectName: r.subjectId?.name || "Unknown",
          status: r.status,
          source: r.source,
          markedAt: r.markedAt?.toISOString(),
          notes: r.notes || "",
        })),
      };
    }

    case "mark_attendance_checkin": {
      const action = args?.action || "get_checkin_status";
      const { getOrCreateDailyCheckin } = await import("@/lib/attendance/session-generator");
      const { createAuditLog } = await import("@/lib/db/audit");
      const checkin = await getOrCreateDailyCheckin(userObjectId, new Date());

      if (action === "get_checkin_status") {
        return {
          isHoliday: checkin.isHoliday,
          holidayTitle: checkin.holidayTitle,
          allConfirmed: checkin.allConfirmed,
          totalClasses: checkin.items.length,
          classes: checkin.items.map((i) => ({
            code: i.subjectCode,
            name: i.subjectName,
            time: `${i.startTime} - ${i.endTime}`,
            status: i.status,
          })),
        };
      }

      if (action === "mark_all_attended") {
        let count = 0;
        for (const item of checkin.items) {
          await Attendance.updateOne(
            { _id: item.attendanceId, userId: userObjectId },
            { $set: { status: "Attended", markedAt: new Date(), source: "ai_assistant" } }
          );
          count++;
        }
        await createAuditLog({
          userId: userObjectId,
          action: "AI_ASSISTANT_MARK_ALL_ATTENDED",
          entityType: "Attendance",
          entityId: userObjectId,
          newData: { status: "Attended", count },
          reason: "Marked all classes attended via AI Assistant",
        });
        return {
          success: true,
          message: `Successfully marked all ${count} classes for today as Attended!`,
          updatedCount: count,
        };
      }

      return { error: `Action '${action}' not supported.` };
    }

    case "get_subject_attendance": {
      const user = await User.findById(userObjectId).select("targetAttendancePercentage");
      const defaultTarget = user?.targetAttendancePercentage || 75;

      const subjects = await Subject.find({ userId: userObjectId });
      const attendanceAgg = await Attendance.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: { subjectId: "$subjectId", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ]);

      const countMap: Record<string, number> = {};
      for (const row of attendanceAgg) {
        if (row._id?.subjectId && row._id?.status) {
          countMap[`${row._id.subjectId.toString()}_${row._id.status}`] = row.count;
        }
      }

      const metricsList = subjects.map((sub) => {
        const subId = sub._id.toString();
        const attended = countMap[`${subId}_Attended`] || 0;
        const absent = countMap[`${subId}_Absent`] || 0;
        const cancelled = countMap[`${subId}_Cancelled`] || 0;
        const pending = countMap[`${subId}_Pending`] || 0;

        return calculateSubjectMetrics({
          subjectId: subId,
          subjectCode: sub.code,
          subjectName: sub.name,
          attended,
          absent,
          cancelled,
          pending,
          targetPercentage: sub.minAttendanceThreshold || defaultTarget,
        });
      });

      if (args?.subjectNameOrCode) {
        const query = args.subjectNameOrCode.toLowerCase().trim();
        const matched = metricsList.find(
          (m) =>
            m.subjectCode.toLowerCase().includes(query) ||
            m.subjectName.toLowerCase().includes(query)
        );

        if (!matched) {
          return {
            error: `No subject matching '${args.subjectNameOrCode}' was found in your registered subjects.`,
            availableSubjects: metricsList.map((m) => `${m.subjectCode} - ${m.subjectName}`),
          };
        }

        return matched;
      }

      const overall = calculateOverallMetrics(metricsList, defaultTarget);
      return { overall, subjects: metricsList };
    }

    case "calculate_bunk_and_targets": {
      const user = await User.findById(userObjectId).select("targetAttendancePercentage");
      const target = args.targetPercentage ? Number(args.targetPercentage) : user?.targetAttendancePercentage || 75;

      // Fetch attendance metrics
      const subjects = await Subject.find({ userId: userObjectId });
      const attendanceAgg = await Attendance.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: { subjectId: "$subjectId", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ]);

      const countMap: Record<string, number> = {};
      for (const row of attendanceAgg) {
        if (row._id?.subjectId && row._id?.status) {
          countMap[`${row._id.subjectId.toString()}_${row._id.status}`] = row.count;
        }
      }

      if (args.subjectNameOrCode) {
        const query = args.subjectNameOrCode.toLowerCase().trim();
        const sub = subjects.find(
          (s) => s.code.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)
        );

        if (!sub) {
          return { error: `Subject '${args.subjectNameOrCode}' not found.` };
        }

        const subId = sub._id.toString();
        const attended = countMap[`${subId}_Attended`] || 0;
        const absent = countMap[`${subId}_Absent`] || 0;
        const conducted = attended + absent;
        const currentPercentage = conducted === 0 ? 100 : Number(((attended / conducted) * 100).toFixed(2));
        const needed = calculateClassesNeeded(attended, conducted, target);
        const canMiss = calculateMaxClassesCanMiss(attended, conducted, target);

        return {
          subjectCode: sub.code,
          subjectName: sub.name,
          targetPercentage: target,
          currentPercentage,
          conducted,
          attended,
          absent,
          classesNeededToReachTarget: needed,
          maxClassesCanMiss: canMiss,
          verdict:
            currentPercentage >= target
              ? `You can safely miss ${canMiss} class(es) while keeping your attendance above ${target}%.`
              : `You must attend the next ${needed} consecutive class(es) to reach ${target}%.`,
        };
      }

      // Overall
      let totalAttended = 0;
      let totalAbsent = 0;
      for (const sub of subjects) {
        const subId = sub._id.toString();
        totalAttended += countMap[`${subId}_Attended`] || 0;
        totalAbsent += countMap[`${subId}_Absent`] || 0;
      }
      const totalConducted = totalAttended + totalAbsent;
      const overallPercentage = totalConducted === 0 ? 100 : Number(((totalAttended / totalConducted) * 100).toFixed(2));
      const needed = calculateClassesNeeded(totalAttended, totalConducted, target);
      const canMiss = calculateMaxClassesCanMiss(totalAttended, totalConducted, target);

      return {
        scope: "Overall",
        targetPercentage: target,
        currentPercentage: overallPercentage,
        totalConducted,
        totalAttended,
        totalAbsent,
        classesNeededToReachTarget: needed,
        maxClassesCanMiss: canMiss,
        verdict:
          overallPercentage >= target
            ? `Overall, you have a buffer to miss ${canMiss} classes while staying at or above ${target}%.`
            : `Overall, you must attend ${needed} consecutive classes to raise your cumulative attendance to ${target}%.`,
      };
    }

    case "get_lowest_attendance_subject": {
      const subjects = await Subject.find({ userId: userObjectId });
      if (subjects.length === 0) {
        return { message: "No subjects registered yet." };
      }

      const attendanceAgg = await Attendance.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: { subjectId: "$subjectId", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ]);

      const countMap: Record<string, number> = {};
      for (const row of attendanceAgg) {
        if (row._id?.subjectId && row._id?.status) {
          countMap[`${row._id.subjectId.toString()}_${row._id.status}`] = row.count;
        }
      }

      const list = subjects.map((sub) => {
        const subId = sub._id.toString();
        const attended = countMap[`${subId}_Attended`] || 0;
        const absent = countMap[`${subId}_Absent`] || 0;
        const conducted = attended + absent;
        const pct = conducted === 0 ? 100 : (attended / conducted) * 100;
        return {
          code: sub.code,
          name: sub.name,
          attended,
          conducted,
          percentage: Number(pct.toFixed(2)),
        };
      });

      // Filter to subjects that had at least 1 conducted class
      const conductedList = list.filter((l) => l.conducted > 0);
      if (conductedList.length === 0) {
        return { message: "No conducted classes recorded yet across subjects." };
      }

      conductedList.sort((a, b) => a.percentage - b.percentage);
      const lowest = conductedList[0];

      return {
        lowestAttendanceSubject: lowest,
        warning: lowest.percentage < 75 ? "CRITICAL: Attendance below 75% threshold!" : "Attendance is within safe range.",
      };
    }

    case "get_upcoming_academic_events": {
      const query: any = { userId: userObjectId };

      if (args.searchTerm && typeof args.searchTerm === "string" && args.searchTerm.trim()) {
        const term = args.searchTerm.trim();
        const regex = new RegExp(term, "i");
        query.$or = [{ title: regex }, { description: regex }];
      } else {
        const daysAhead = args.daysAhead || 180;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + daysAhead);
        query.date = { $gte: today, $lte: futureDate };
      }

      if (args.eventType && args.eventType !== "All") {
        query.type = args.eventType;
      }

      const events = await AcademicEvent.find(query)
        .populate("subjectId", "code name")
        .sort({ date: 1 });

      let formattedEvents = events.map((e: any) => ({
        title: e.title,
        type: e.type,
        date: e.date.toISOString().split("T")[0],
        endDate: e.endDate ? e.endDate.toISOString().split("T")[0] : undefined,
        subject: e.subjectId?.code || undefined,
        isHoliday: e.isHoliday,
        description: e.description,
      }));

      // Fallback: If no events found in AcademicEvent collection, search latest uploaded calendar document
      if (formattedEvents.length === 0) {
        const { UploadedDocument } = await import("@/lib/db/models/UploadedDocument");
        const doc = await UploadedDocument.findOne({
          userId: userObjectId,
          fileType: "academic_calendar_pdf",
        }).sort({ createdAt: -1 });

        const extractedCalendar = doc?.extractedData?.calendarEvents || [];
        if (extractedCalendar.length > 0) {
          const matchingEvents = args.searchTerm && typeof args.searchTerm === "string" && args.searchTerm.trim()
            ? extractedCalendar.filter((ev: any) => {
                const term = args.searchTerm.toLowerCase().trim();
                return ev.title?.toLowerCase().includes(term) || ev.description?.toLowerCase().includes(term);
              })
            : extractedCalendar.slice(0, 30);

          formattedEvents = matchingEvents.map((ev: any) => ({
            title: ev.title,
            type: ev.type || "Event",
            date: ev.date,
            endDate: ev.endDate,
            subject: undefined,
            isHoliday: Boolean(ev.isHoliday),
            description: ev.description || ev.title,
          }));
        }
      }

      return {
        count: formattedEvents.length,
        events: formattedEvents,
      };
    }

    case "get_weekly_timetable": {
      const slots = await Timetable.find({
        userId: userObjectId,
        isActive: true,
      })
        .populate("subjectId", "code name room color faculty")
        .sort({ dayOfWeek: 1, "timeSlot.startTime": 1 });

      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const scheduleByDay: Record<string, any[]> = {};

      for (let i = 1; i <= 6; i++) {
        scheduleByDay[dayNames[i]] = [];
      }

      for (const slot of slots as any[]) {
        const dName = dayNames[slot.dayOfWeek];
        if (!scheduleByDay[dName]) scheduleByDay[dName] = [];
        scheduleByDay[dName].push({
          subjectCode: slot.subjectId?.code || "Unknown",
          subjectName: slot.subjectId?.name || "Unknown",
          time: `${slot.timeSlot.startTime} - ${slot.timeSlot.endTime}`,
          room: slot.room || "TBA",
          type: slot.type,
        });
      }

      return { schedule: scheduleByDay };
    }

    case "predict_semester_attendance": {
      const userDoc = await User.findById(userObjectId).select("targetAttendancePercentage");
      const defaultTarget = userDoc?.targetAttendancePercentage || 75;

      const subjects = await Subject.find({ userId: userObjectId }).sort({ code: 1 });
      const attendanceAgg = await Attendance.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: { subjectId: "$subjectId", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ]);

      const countMap: Record<string, number> = {};
      for (const row of attendanceAgg) {
        if (row._id?.subjectId && row._id?.status) {
          countMap[`${row._id.subjectId.toString()}_${row._id.status}`] = row.count;
        }
      }

      const subjectMetrics = subjects.map((sub) => {
        const subId = sub._id.toString();
        const attended = countMap[`${subId}_Attended`] || 0;
        const absent = countMap[`${subId}_Absent`] || 0;
        const cancelled = countMap[`${subId}_Cancelled`] || 0;
        const pending = countMap[`${subId}_Pending`] || 0;
        return calculateSubjectMetrics({
          subjectId: subId,
          subjectCode: sub.code,
          subjectName: sub.name,
          color: sub.color,
          attended,
          absent,
          cancelled,
          pending,
          targetPercentage: sub.minAttendanceThreshold || defaultTarget,
        });
      });

      const [timetableSlots, academicEvents] = await Promise.all([
        Timetable.find({ userId: userObjectId, isActive: true }).select("subjectId dayOfWeek"),
        AcademicEvent.find({ userId: userObjectId }).select("date endDate type isHoliday"),
      ]);

      const predictions = calculateSemesterPredictions({
        subjects: subjectMetrics,
        timetableSlots: timetableSlots.map((s) => ({
          subjectId: s.subjectId.toString(),
          dayOfWeek: s.dayOfWeek,
        })),
        academicEvents: academicEvents.map((ev) => ({
          date: ev.date,
          endDate: ev.endDate,
          type: ev.type,
          isHoliday: ev.isHoliday,
        })),
        targetPercentage: defaultTarget,
      });

      if (args?.subjectNameOrCode) {
        const cleanQuery = args.subjectNameOrCode.toLowerCase().trim();
        const matched = predictions.subjects.find(
          (s) =>
            s.subjectCode.toLowerCase() === cleanQuery ||
            s.subjectName.toLowerCase().includes(cleanQuery)
        );
        if (matched) {
          return {
            searchedSubject: args.subjectNameOrCode,
            semesterEndDate: predictions.semesterEndDate,
            daysRemaining: predictions.daysRemaining,
            prediction: matched,
            summaryMessage: matched.canReachTarget
              ? `In ${matched.subjectCode}, you currently have ${matched.currentPercentage}% (${matched.currentAttended}/${matched.currentConducted}). With ${matched.remainingClasses} class(es) remaining until semester end (${predictions.semesterEndDate}), your maximum achievable attendance is ${matched.maxAchievablePercentage}%. You must attend at least ${matched.classesNeededOfRemaining} of the remaining classes to achieve your ${matched.targetPercentage}% target (you can safely miss up to ${matched.maxCanMissOfRemaining}).`
              : `⚠️ Warning: In ${matched.subjectCode}, even if you attend 100% of the remaining ${matched.remainingClasses} classes, your maximum attendance will only reach ${matched.maxAchievablePercentage}%, which is below your target of ${matched.targetPercentage}%.`,
          };
        }
      }

      return predictions;
    }

    case "get_uploaded_document_details": {
      const { UploadedDocument } = await import("@/lib/db/models/UploadedDocument");
      const query: any = { userId: userObjectId };
      if (args?.documentType && args.documentType !== "all") {
        query.fileType = args.documentType;
      }
      const docs = await UploadedDocument.find(query).sort({ createdAt: -1 }).limit(5);

      if (docs.length === 0) {
        return {
          message: "No documents have been uploaded yet. The student can upload timetable or calendar PDFs on the Upload page.",
          documents: [],
        };
      }

      return {
        count: docs.length,
        documents: docs.map((d: any) => ({
          documentId: d._id,
          fileName: d.fileName,
          fileType: d.fileType,
          uploadedAt: d.createdAt,
          isVerified: d.isVerifiedByUser,
          detectedSubjects: d.extractedData?.subjects || [],
          timetableSlotsCount: d.extractedData?.timetableSlots?.length || 0,
          calendarEventsCount: d.extractedData?.calendarEvents?.length || 0,
          calendarEvents: (d.extractedData?.calendarEvents || []).slice(0, 30),
          rawTextSample: d.rawText ? d.rawText.slice(0, 3000) : "No text available.",
        })),
      };
    }

    default:
      return { error: `Tool ${toolName} not recognized.` };
  }
}
