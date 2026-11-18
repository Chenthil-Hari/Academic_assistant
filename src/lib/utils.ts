import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(time: string): string {
  if (!time) return "";
  // Check if format is "HH:mm"
  const parts = time.split(":");
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const mins = parts[1];
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${mins} ${ampm}`;
  }
  return time;
}

export function getDayName(dayIndex: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dayIndex] || "";
}
