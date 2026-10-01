import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getEnabledProviders } from "@/lib/authProviders";
import { ProviderSignInButtons } from "@/components/ProviderSignInButtons";
import { AuthShell } from "@/components/AuthShell";
import { linkClass } from "@/components/ui/styles";
import f from "@/components/ui/form.module.scss";

// Just a token-capturing landing page — /invites owns every acceptance
// rule (already-onboarded confirmation, an existing TA picking up another
// course, etc.), so a signed-in visitor goes straight there.
export default async function InviteLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const target = `/invites?token=${encodeURIComponent(token)}`;

  const session = await auth();
  if (session) redirect(target);

  const t = await getTranslations("invite");
  const tCommon = await getTranslations("common");
  const tLogin = await getTranslations("login");
  const tSignup = await getTranslations("signup");
  const providers = getEnabledProviders();
  const callbackParam = `callbackUrl=${encodeURIComponent(target)}`;

  return (
    <AuthShell appName={tCommon("appName")}>
      <div className={f.stack}>
        <div className={f.field}>
          <h1 className={f.heading}>{t("title")}</h1>
          <p className={f.muted}>{t("subtitle")}</p>
        </div>
        <ProviderSignInButtons providers={providers} callbackUrl={target} />

        <div className={f.divider}>
          {tLogin("or")}
        </div>

        <p className={`${f.muted} ${f.center}`}>
          <Link href={`/login?${callbackParam}`} className={linkClass}>
            {tLogin("submit")}
          </Link>
          {" · "}
          <Link href={`/signup?${callbackParam}`} className={linkClass}>
            {tSignup("submit")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
