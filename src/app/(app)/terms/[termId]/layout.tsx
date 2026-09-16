import { requireTermAccess } from "@/lib/termAccess";

export default async function TermLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ termId: string }>;
}) {
  const { termId } = await params;
  await requireTermAccess(termId); // access check only — nav lives in the sidebar now, breadcrumbs are per-page

  return <div className="mx-auto max-w-6xl">{children}</div>;
}
