"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import type { AuthProviderId } from "@/lib/authProviders";

const BUTTON_STYLES: Record<AuthProviderId, string> = {
  google: "border border-zinc-300 text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800",
  facebook: "bg-[#1877F2] text-white hover:brightness-95",
  line: "bg-[#06C755] text-white hover:brightness-95",
};

function ProviderIcon({ provider }: { provider: AuthProviderId }) {
  if (provider === "google") {
    return (
      <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.6 27 35.5 24 35.5c-5.2 0-9.6-3.3-11.2-7.9l-6.6 5.1C9.6 39.6 16.3 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.4 36.1 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z"
        />
      </svg>
    );
  }

  if (provider === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M12 2C6.5 2 2 5.6 2 10c0 3.9 3.5 7.2 8.3 7.9.3.1.7.3.8.6.1.3 0 .8 0 1.1l-.1.8c0 .2-.2.9.8.5 1-.4 5.4-3.2 7.4-5.5C20.5 13.9 22 12.1 22 10c0-4.4-4.5-8-10-8zm-3.5 9.9H7c-.2 0-.3-.1-.3-.3V7.8c0-.2.1-.3.3-.3s.3.1.3.3v3.4h1.2c.2 0 .3.1.3.3s-.1.4-.3.4zm1.7 0c-.2 0-.3-.1-.3-.3V7.8c0-.2.1-.3.3-.3s.3.1.3.3v3.8c0 .2-.1.3-.3.3zm4.4 0c-.1 0-.2 0-.2-.1l-2-2.7v2.5c0 .2-.1.3-.3.3s-.3-.1-.3-.3V7.8c0-.1.1-.2.2-.3h.1c.1 0 .2 0 .2.1l2 2.7V7.8c0-.2.1-.3.3-.3s.3.1.3.3v3.8c0 .1-.1.2-.2.3zm3.1-3.1c.2 0 .3.1.3.3s-.1.3-.3.3h-1.5v.8h1.5c.2 0 .3.1.3.3s-.1.4-.3.4h-1.8c-.2 0-.3-.1-.3-.3V7.8c0-.2.1-.3.3-.3h1.8c.2 0 .3.1.3.3s-.1.3-.3.3h-1.5v.7z" />
    </svg>
  );
}

export function ProviderSignInButtons({
  providers,
  callbackUrl = "/",
}: {
  providers: AuthProviderId[];
  callbackUrl?: string;
}) {
  const t = useTranslations("login");

  // No error here: zero providers is the expected state while OAuth
  // sign-in is deliberately disabled (see src/lib/authProviders.ts) — not
  // just a misconfiguration — and Credentials login still works below.
  if (providers.length === 0) return null;

  return (
    <div className="space-y-2">
      {providers.map((provider) => (
        <button
          key={provider}
          type="button"
          onClick={() => signIn(provider, { callbackUrl })}
          className={`flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${BUTTON_STYLES[provider]}`}
        >
          <ProviderIcon provider={provider} />
          {t(`continueWith.${provider}`)}
        </button>
      ))}
    </div>
  );
}
