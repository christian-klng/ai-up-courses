import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { db } from "@/server/db/client";
import { accounts, sessions, users, verifications, type Community } from "@/server/db/schema";
import { env } from "@/server/env";
import { logger } from "@/server/logger";
import { sendMail } from "@/server/mail/mailer";
import { magicLinkMail, mailContext } from "@/server/mail/templates";
import { getCommunityBySlug } from "@/server/domain/communities";
import { resolveCommunityInvite } from "@/server/domain/community-invites";
import { getUserByEmail } from "@/server/domain/users";
import { APP_NAME } from "@/lib/app";

export const MAGIC_LINK_TTL_SECONDS = 60 * 15;

/**
 * The community a magic link leads into, read from its callback path (`/c/<slug>/…` or
 * `/join/<token>/…`), so the mail wears that community's name and color. Signing in itself is not
 * bound to a community – the session is the account's.
 */
async function communityOfCallback(url: string): Promise<Community | undefined> {
  try {
    const callback = new URL(url).searchParams.get("callbackURL") ?? "";
    const path = new URL(callback, env.APP_URL).pathname;
    const slug = /^\/c\/([^/]+)/.exec(path)?.[1];
    if (slug) return await getCommunityBySlug(slug);
    const token = /^\/join\/([^/]+)/.exec(path)?.[1];
    if (token) return (await resolveCommunityInvite(token))?.community;
  } catch {
    /* neutral mail */
  }
  return undefined;
}

/**
 * Better Auth instance. Magic link is the only sign-in method, and the endpoint never creates
 * accounts: they come from a join link or the operator (PLAN.md §3.2, no open registration).
 */
export const auth = betterAuth({
  appName: APP_NAME,
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.APP_URL],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: users, session: sessions, account: accounts, verification: verifications },
  }),
  emailAndPassword: { enabled: false },
  user: {
    additionalFields: {
      status: { type: "string", input: false, defaultValue: "active" },
      locale: { type: "string", input: false, defaultValue: env.DEFAULT_LOCALE },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once per day
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  advanced: {
    // UUIDs everywhere (§3.3 rule 1) – the id columns are of type uuid.
    database: { generateId: () => crypto.randomUUID() },
    useSecureCookies: env.APP_URL.startsWith("https://"),
    cookiePrefix: "courses",
  },
  plugins: [
    magicLink({
      disableSignUp: true,
      expiresIn: MAGIC_LINK_TTL_SECONDS,
      storeToken: "hashed",
      rateLimit: { window: 60, max: 5 },
      async sendMagicLink({ email, url }) {
        const user = await getUserByEmail(email);
        if (!user || user.status !== "active") {
          // Never leak account state; just don't send anything.
          logger.warn({ email, status: user?.status ?? "unknown" }, "magic link requested for non-active account");
          return;
        }
        await sendMail(magicLinkMail(mailContext(await communityOfCallback(url), user.locale), email, url));
      },
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
