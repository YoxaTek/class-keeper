"use server";

import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";

export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  const session = await auth();
  if (session?.user.id) {
    await persistUserLocale(session.user.id, locale);
  }
}

async function persistUserLocale(userId: string, locale: Locale) {
  await prisma.user.update({ where: { id: userId }, data: { locale } });
}
