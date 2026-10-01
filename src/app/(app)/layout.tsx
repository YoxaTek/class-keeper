import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import { AppShell } from "@/components/AppShell";
import { cookies } from "next/headers";
import { THEME_COOKIE, isTheme } from "@/lib/theme";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user.onboardingComplete) redirect("/onboarding");

  const themeCookie = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = isTheme(themeCookie) ? themeCookie : "system";

  return (
    <AppShell name={user.name} email={user.email} image={user.image} role={user.role} theme={theme}>
      {children}
    </AppShell>
  );
}
