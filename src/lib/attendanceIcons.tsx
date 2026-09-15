import { CircleCheck, Clock, CircleX, Plane, CircleDashed } from "lucide-react";
import type { AttendanceStatus } from "@prisma/client";
import type { ComponentType } from "react";

export const attendanceIcon: Record<AttendanceStatus, ComponentType<{ className?: string }>> = {
  PRESENT: CircleCheck,
  EXCUSED: Clock,
  ABSENT: CircleX,
  ABROAD: Plane,
  NOT_ENROLLED: CircleDashed,
};

export const attendanceColor: Record<AttendanceStatus, string> = {
  PRESENT: "text-[#0f6e56] dark:text-teal-400",
  EXCUSED: "text-zinc-500 dark:text-zinc-400",
  ABSENT: "text-red-600 dark:text-red-400",
  ABROAD: "text-zinc-500 dark:text-zinc-400",
  NOT_ENROLLED: "text-zinc-400 dark:text-zinc-600",
};
