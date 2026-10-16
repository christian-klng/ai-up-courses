"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/server/auth/auth";
import { getAccount } from "@/server/auth/session";
import { joinViaCommunityInvite, resolveCommunityInvite } from "@/server/domain/community-invites";
import { ensureUser, getUserByEmail } from "@/server/domain/users";
import { isLocale } from "@/i18n/config";
import { communityPath } from "@/lib/slug";
import { logger } from "@/server/logger";

export type AuthFormState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; code: "invalidEmail" | "nameRequired" | "tooManyRequests" | "invalidInvite" | "unexpected" };

const emailSchema = z.string().trim().toLowerCase().email();

/** Only relative, same-origin paths are accepted as a target after sign-in. */
function safeNext(raw: FormDataEntryValue | null): string {
  const next = typeof raw === "string" ? raw : "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function isRateLimited(err: unknown): boolean {
  const status = (err as { status?: number | string })?.status;
  return status === 429 || status === "TOO_MANY_REQUESTS";
}

/** Requests a magic link. Always answers "sent" for well-formed e-mails to avoid account enumeration. */
export async function requestMagicLink(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { status: "error", code: "invalidEmail" };
  const callbackURL = safeNext(formData.get("next"));

  try {
    const user = await getUserByEmail(email.data);
    if (user && user.status === "active") {
      await auth.api.signInMagicLink({
        headers: await headers(),
        body: { email: email.data, callbackURL, errorCallbackURL: "/login?error=invalid_link" },
      });
    } else {
      logger.info({ email: email.data, status: user?.status ?? "none" }, "magic link not sent (no active account)");
    }
  } catch (err) {
    if (isRateLimited(err)) return { status: "error", code: "tooManyRequests" };
    logger.error({ err }, "magic link request failed");
    return { status: "error", code: "unexpected" };
  }
  return { status: "sent", email: email.data };
}

const joinSchema = z.object({
  token: z.string().min(1).max(64),
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
});

/**
 * Registration through a join link. The membership is only created once the magic link has been
 * clicked (`/join/<token>/accept`): until then nobody has proven they own the address, and typing a
 * stranger's e-mail must not make them a member. Existing accounts get the same link; the answer is
 * identical either way (no enumeration).
 */
export async function registerViaJoinLink(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = joinSchema.safeParse({ token: formData.get("token"), name: formData.get("name"), email: formData.get("email") });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { status: "error", code: field === "name" ? "nameRequired" : field === "email" ? "invalidEmail" : "invalidInvite" };
  }
  const resolved = await resolveCommunityInvite(parsed.data.token);
  if (!resolved) return { status: "error", code: "invalidInvite" };
  const localeRaw = await getLocale();
  const locale = isLocale(localeRaw) ? localeRaw : resolved.community.defaultLocale;
  const target = `/join/${parsed.data.token}/accept`;

  try {
    const user = await ensureUser({ email: parsed.data.email, name: parsed.data.name, locale });
    if (user.status === "active") {
      await auth.api.signInMagicLink({
        headers: await headers(),
        body: { email: user.email, callbackURL: target, errorCallbackURL: `/login?error=invalid_link&next=${encodeURIComponent(target)}` },
      });
    }
  } catch (err) {
    if (isRateLimited(err)) return { status: "error", code: "tooManyRequests" };
    logger.error({ err, inviteId: resolved.invite.id }, "join-link registration failed");
    return { status: "error", code: "unexpected" };
  }
  return { status: "sent", email: parsed.data.email };
}

/** One-click join for an account that is already signed in. */
export async function joinCommunityAction(token: string): Promise<{ ok: true; href: string } | { ok: false; reason: "invalid" | "suspended" | "unauthenticated" }> {
  const account = await getAccount();
  if (!account) return { ok: false, reason: "unauthenticated" };
  const res = await joinViaCommunityInvite(token, account.id);
  if (!res.ok) return res;
  return { ok: true, href: communityPath(res.community.slug) };
}

export async function signOut(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
