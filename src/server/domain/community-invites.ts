import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { communities, communityInvites, communityMembers, type Community, type CommunityInvite } from "@/server/db/schema";
import { emit } from "@/server/events/bus";
import { env } from "@/server/env";
import { addMembership } from "./communities";

/**
 * The join link of a community – the only way into one besides the operator (PLAN.md §3.2).
 *
 * Same pattern as AI-Up's `community_invites`: a random token, off by default, and while the link is
 * **enabled** anyone holding it becomes an active member right away. Switching it off keeps the
 * token, so a link handed out earlier works again after re-enabling.
 */

export function joinUrl(token: string): string {
  return `${env.APP_URL}/join/${token}`;
}

export type InviteWithUrl = CommunityInvite & { url: string };

export async function getCommunityInvite(communityId: string): Promise<InviteWithUrl | undefined> {
  const row = await db.query.communityInvites.findFirst({ where: eq(communityInvites.communityId, communityId) });
  return row ? { ...row, url: joinUrl(row.token) } : undefined;
}

/** Switches the link on or off; the row (and the URL) is created on first use. */
export async function setCommunityInviteEnabled(communityId: string, enabled: boolean, actorId: string): Promise<InviteWithUrl> {
  const existing = await db.query.communityInvites.findFirst({ where: eq(communityInvites.communityId, communityId) });
  const [row] = existing
    ? await db.update(communityInvites).set({ enabled }).where(eq(communityInvites.id, existing.id)).returning()
    : await db
        .insert(communityInvites)
        .values({ communityId, token: randomBytes(24).toString("base64url"), enabled, createdBy: actorId })
        .returning();
  return { ...row, url: joinUrl(row.token) };
}

export type ResolvedCommunityInvite = { invite: CommunityInvite; community: Community };

/** Returns the invite and its community when the token is valid and the link is switched on. */
export async function resolveCommunityInvite(token: string): Promise<ResolvedCommunityInvite | null> {
  if (!token || token.length > 64) return null;
  const [row] = await db
    .select({ invite: communityInvites, community: communities })
    .from(communityInvites)
    .innerJoin(communities, eq(communities.id, communityInvites.communityId))
    .where(eq(communityInvites.token, token))
    .limit(1);
  if (!row || !row.invite.enabled) return null;
  return row;
}

export type JoinResult = { ok: true; community: Community; alreadyMember: boolean } | { ok: false; reason: "invalid" | "suspended" };

/**
 * Lets an account join through the link. Idempotent: someone who is already a member just gets
 * `alreadyMember`. A *suspended* membership is not revived – otherwise anyone thrown out could walk
 * back in through a URL they kept.
 */
export async function joinViaCommunityInvite(token: string, userId: string): Promise<JoinResult> {
  const resolved = await resolveCommunityInvite(token);
  if (!resolved) return { ok: false, reason: "invalid" };
  const { invite, community } = resolved;

  const existing = await db.query.communityMembers.findFirst({
    where: and(eq(communityMembers.communityId, community.id), eq(communityMembers.userId, userId)),
  });
  if (existing?.status === "suspended") return { ok: false, reason: "suspended" };
  if (existing) return { ok: true, community, alreadyMember: true };

  if (await addMembership(community.id, userId, "member")) {
    await db
      .update(communityInvites)
      .set({ useCount: sql`${communityInvites.useCount} + 1` })
      .where(eq(communityInvites.id, invite.id));
    await emit("member.joined", community.id, userId, { userId, via: "invite" });
  }
  return { ok: true, community, alreadyMember: false };
}
