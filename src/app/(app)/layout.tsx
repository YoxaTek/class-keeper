import { redirect } from "next/navigation";
import { getCurrentUser, getStaffCourses } from "@/lib/currentUser";
import { AppShell } from "@/components/AppShell";

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

  return (
    <AppShell name={user.name} email={user.email} image={user.image} role={user.role} courses={courses}>
      {children}
    </AppShell>
  );
}
