import { requireCourseAccess } from "@/lib/courseAccess";

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  await requireCourseAccess(courseId); // access check only — nav lives in the sidebar now, breadcrumbs are per-page

  return <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">{children}</div>;
}
