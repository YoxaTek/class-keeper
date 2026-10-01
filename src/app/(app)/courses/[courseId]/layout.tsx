import { requireCourseAccess } from "@/lib/courseAccess";
import s from "./layout.module.scss";

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  await requireCourseAccess(courseId); // access check only — nav lives in the sidebar now, breadcrumbs are per-page

  return <div className={s.content}>{children}</div>;
}
