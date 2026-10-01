import { getTranslations } from "next-intl/server";
import { getEnabledProviders } from "@/lib/authProviders";
import { safeCallbackUrl } from "@/lib/safeCallbackUrl";
import { AuthShell } from "@/components/AuthShell";
import { joinCourseLabel } from "@/lib/joinCourseLabel";
import { LoginForm } from "./LoginForm";
import f from "@/components/ui/form.module.scss";
import s from "./login.module.scss";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const providers = getEnabledProviders();
  const t = await getTranslations("login");
  const tCommon = await getTranslations("common");
  const { callbackUrl } = await searchParams;
  const safeUrl = safeCallbackUrl(callbackUrl);
  // Arriving here is itself the result of a successful scan (see
  // QrScanner's unauthenticated fallback) — showing the same "Scan QR
  // code" button again reads as if nothing happened, and there's nothing
  // left to scan for since the target is already baked into callbackUrl.
  const fromScan = safeUrl.startsWith("/invites");
  const joinCourse = await joinCourseLabel(safeUrl);

  return (
    <AuthShell appName={tCommon("appName")}>
      <div className={f.stack}>
        <div className={f.field}>
          <h1 className={s.title}>{t("title")}</h1>
          <p className={f.muted}>{t("subtitle")}</p>
        </div>

        {fromScan && (
          <p className={f.notice}>
            {joinCourse ? t("joinCourseBanner", { course: joinCourse }) : t("scannedBanner")}
          </p>
        )}

        <LoginForm providers={providers} callbackUrl={safeUrl} hideQrScan={fromScan} />
      </div>
    </AuthShell>
  );
}
