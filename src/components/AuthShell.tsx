import Image from "next/image";
import { BookOpenCheck } from "lucide-react";

/**
 * Shared frame for the signed-out screens (login/signup/onboarding/invite):
 * a fixed branded panel plus a left-aligned content column — deliberately
 * not a floating white card centered on a gray page.
 */
export function AuthShell({ children, appName }: { children: React.ReactNode; appName: string }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-80 shrink-0 flex-col justify-between bg-[#0b3d31] p-8 text-white sm:flex">
        <div className="flex items-center gap-2 font-semibold">
          <Image src="/icon-512.png" alt="" width={24} height={24} className="rounded-sm" />
          {appName}
        </div>
        <div className="space-y-3 text-sm text-teal-100">
          <BookOpenCheck className="h-6 w-6 text-teal-300" aria-hidden />
          <p>Attendance, grading, and roster management for a Chinese language class.</p>
        </div>
        <div />
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-12 sm:justify-start sm:px-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
