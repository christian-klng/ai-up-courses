import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { getCommunity, getCommunityBySlug, roleIn } from "@/server/domain/communities";
import { getUserById } from "@/server/domain/users";
import { isOperatorEmail } from "@/server/env";
import type { Community, MemberRole, User } from "@/server/db/schema";

/**
 * Session guards. Pages use `require*()` (redirect / 404), server actions use `assert*()` (throw).
 *
 * The community always comes from the URL (`/c/<slug>/…`), never from a cookie: a link says which
 * community it means, and every guard asks `roleIn()` whether the account may be there.
 */

/** The signed-in, active account, or null. Memoized per request. */
export const getAccount = cache(async (): Promise<User | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const user = await getUserById(session.user.id);
  return user?.status === "active" ? user : null;
});

export async function requireAccount(next?: string): Promise<User> {
  const user = await getAccount();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export type MemberContext = { user: User; community: Community; role: MemberRole };

/**
 * Account + community + role for a page under `/c/<slug>`. A community the account does not belong
 * to answers 404 – the same as one that does not exist, so slugs cannot be probed.
 */
export const requireMember = cache(async (slug: string): Promise<MemberContext> => {
  const user = await requireAccount(`/c/${slug}`);
  const community = await getCommunityBySlug(slug);
  if (!community) notFound();
  const role = await roleIn(community.id, user.id);
  if (!role) notFound();
  return { user, community, role };
});

export async function requireCommunityAdmin(slug: string): Promise<MemberContext> {
  const ctx = await requireMember(slug);
  if (ctx.role !== "admin") notFound();
  return ctx;
}

export function isOperator(user: Pick<User, "email">): boolean {
  return isOperatorEmail(user.email);
}

export async function requireOperator(): Promise<User> {
  const user = await requireAccount("/operator");
  if (!isOperator(user)) notFound();
  return user;
}

export class ForbiddenError extends Error {
  constructor(message = "forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function assertAccount(): Promise<User> {
  const user = await getAccount();
  if (!user) throw new ForbiddenError("not signed in");
  return user;
}

/** Server-action guard: the caller is an active member of this community (by id, from the form). */
export async function assertMember(communityId: string): Promise<MemberContext> {
  const user = await assertAccount();
  const [community, role] = await Promise.all([getCommunity(communityId), roleIn(communityId, user.id)]);
  if (!community || !role) throw new ForbiddenError("not a member");
  return { user, community, role };
}

export async function assertCommunityAdmin(communityId: string): Promise<MemberContext> {
  const ctx = await assertMember(communityId);
  if (ctx.role !== "admin") throw new ForbiddenError("admin required");
  return ctx;
}

export async function assertOperator(): Promise<User> {
  const user = await assertAccount();
  if (!isOperator(user)) throw new ForbiddenError("operator required");
  return user;
}
