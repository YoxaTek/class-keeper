import { CircleCheck, Clock, CircleX, CircleDashed, type LucideIcon } from "lucide-react";
import type { AttendanceStatus } from "@prisma/client";
import s from "./attendanceStatus.module.scss";

export const attendanceIcon: Record<AttendanceStatus, LucideIcon> = {
  PRESENT: CircleCheck,
  EXCUSED: Clock,
  ABSENT: CircleX,
  NOT_ENROLLED: CircleDashed,
};

export const attendanceColor: Record<AttendanceStatus, string> = {
  PRESENT: s.present,
  EXCUSED: s.excused,
  ABSENT: s.absent,
  NOT_ENROLLED: s.notEnrolled,
};

// Solid-fill counterparts, for the compact status buttons (filled when selected).
export const attendanceFill: Record<AttendanceStatus, string> = {
  PRESENT: s.fillPresent,
  EXCUSED: s.fillExcused,
  ABSENT: s.fillAbsent,
  NOT_ENROLLED: s.fillNotEnrolled,
};

// attendanceColor with a neutral NOT_ENROLLED instead of indigo.
export const attendanceTextMuted: Record<AttendanceStatus, string> = {
  ...attendanceColor,
  NOT_ENROLLED: s.notEnrolledMuted,
};
