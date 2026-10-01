import { redirect } from "next/navigation";
import { getCurrentUser, getStaffCourses } from "@/lib/currentUser";
import { AppShell } from "@/components/AppShell";
import { cookies } from "next/headers";
import { THEME_COOKIE, isTheme } from "@/lib/theme";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user.onboardingComplete) redirect("/onboarding");

  const isStaff = user.role === "TEACHER" || user.role === "TA";
  // A student only ever sees their own read-only summary, never a
  // course-scoped sidebar — AppShell already renders neither for them
  // (AppSidebar needs a /courses/[id] path a student never has), so an
  // empty list is enough for the header's course switcher to have nothing
  // to show.
  const courses = isStaff ? await getStaffCourses() : [];

  const themeCookie = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = isTheme(themeCookie) ? themeCookie : "system";

  return (
    <AppShell name={user.name} email={user.email} image={user.image} role={user.role} theme={theme} courses={courses}>
      {children}
    </AppShell>
  );
}
