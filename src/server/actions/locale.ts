"use server";

import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { getAccount } from "@/server/auth/session";
import { updateUserLocale } from "@/server/domain/users";

/** Sets the UI language (cookie) and, when signed in, persists it on the account (mails use it). */
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
  const user = await getAccount();
  if (user && user.locale !== locale) await updateUserLocale(user.id, locale);
}
