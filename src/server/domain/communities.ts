import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { communities, communityMembers, DEFAULT_THEME, users, type Community, type MemberRole, type ThemeSettings, type User } from "@/server/db/schema";
import { emit } from "@/server/events/bus";
import { ensureUser } from "./users";

/**
 * Communities and memberships.
 *
 * Rules carried over from AI-Up (PLAN.md §3.2): the community is always an explicit parameter, and
 * functions that load by id check that the row belongs to it – otherwise they answer `undefined`,
 * exactly like "does not exist".
 */

export async function getCommunity(id: string): Promise<Community | undefined> {
  return db.query.communities.findFirst({ where: eq(communities.id, id) });
}

export async function getCommunityBySlug(slug: string): Promise<Community | undefined> {
  return db.query.communities.findFirst({ where: eq(communities.slug, slug) });
}

/**
 * The one place that answers "what may this account do in this community?" (§3.3 rule 3).
 * `undefined` for strangers and suspended members. After the AI-Up link this reads the role claim
 * of the token instead of `community_members`, and no caller notices.
 */
export async function roleIn(communityId: string, userId: string): Promise<MemberRole | undefined> {
  const row = await db.query.communityMembers.findFirst({
    columns: { role: true, status: true },
    where: and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)),
  });
  return row?.status === "active" ? row.role : undefined;
}

export type MembershipWithCommunity = { community: Community; role: MemberRole };

/** Active memberships of an account, by community name – the community picker and the switcher. */
export async function listMembershipsForUser(userId: string): Promise<MembershipWithCommunity[]> {
  const rows = await db
    .select({ community: communities, role: communityMembers.role })
    .from(communityMembers)
    .innerJoin(communities, eq(communities.id, communityMembers.communityId))
    .where(and(eq(communityMembers.userId, userId), eq(communityMembers.status, "active")))
    .orderBy(asc(communities.name));
  return rows;
}

export type MemberRow = Pick<User, "id" | "name" | "email"> & { role: MemberRole; status: "active" | "suspended"; joinedAt: Date };

export async function listMembers(communityId: string): Promise<MemberRow[]> {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: communityMembers.role,
      status: communityMembers.status,
      joinedAt: communityMembers.joinedAt,
    })
    .from(communityMembers)
    .innerJoin(users, eq(users.id, communityMembers.userId))
    .where(eq(communityMembers.communityId, communityId))
    .orderBy(asc(users.name));
}

/** Is this user the only active admin left? Then they may not be demoted or suspended. */
export async function isLastAdmin(communityId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ others: sql<number>`count(*)::int` })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.role, "admin"),
        eq(communityMembers.status, "active"),
        ne(communityMembers.userId, userId),
      ),
    );
  return (row?.others ?? 0) === 0;
}

export type MemberChangeResult = { ok: true } | { ok: false; reason: "not_found" | "last_admin" };

export async function setMemberRole(communityId: string, userId: string, role: MemberRole, actorId: string): Promise<MemberChangeResult> {
  const current = await roleIn(communityId, userId);
  if (!current) return { ok: false, reason: "not_found" };
  if (current === role) return { ok: true };
  if (role !== "admin" && (await isLastAdmin(communityId, userId))) return { ok: false, reason: "last_admin" };
  await db
    .update(communityMembers)
    .set({ role })
    .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)));
  await emit("member.role_changed", communityId, actorId, { userId, role });
  return { ok: true };
}

export async function setMemberStatus(communityId: string, userId: string, status: "active" | "suspended", actorId: string): Promise<MemberChangeResult> {
  const row = await db.query.communityMembers.findFirst({
    where: and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)),
  });
  if (!row) return { ok: false, reason: "not_found" };
  if (row.status === status) return { ok: true };
  if (status === "suspended" && row.role === "admin" && (await isLastAdmin(communityId, userId))) return { ok: false, reason: "last_admin" };
  await db
    .update(communityMembers)
    .set({ status })
    .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)));
  await emit(status === "suspended" ? "member.suspended" : "member.reactivated", communityId, actorId, { userId });
  return { ok: true };
}

/** Adds an active membership; an existing one is left as it is (a suspension is never lifted here). */
export async function addMembership(communityId: string, userId: string, role: MemberRole): Promise<boolean> {
  const inserted = await db.insert(communityMembers).values({ communityId, userId, role, status: "active" }).onConflictDoNothing().returning();
  return inserted.length > 0;
}

// ---------------------------------------------------------------------------
// Operator
// ---------------------------------------------------------------------------

export type CommunityWithCount = Community & { memberCount: number };

export async function listAllCommunities(): Promise<CommunityWithCount[]> {
  const rows = await db
    .select({
      community: communities,
      memberCount: sql<number>`(select count(*)::int from ${communityMembers} where ${communityMembers}."community_id" = ${communities}."id" and ${communityMembers}."status" = 'active')`,
    })
    .from(communities)
    .orderBy(asc(communities.name));
  return rows.map((r) => ({ ...r.community, memberCount: r.memberCount }));
}

export type CreateCommunityResult = { ok: true; community: Community } | { ok: false; reason: "slug_taken" };

/**
 * Creates a community together with its first admin. The admin account is reused when the address
 * already has one, so the operator can make themselves the admin, too.
 */
export async function createCommunity(
  input: { name: string; slug: string; adminEmail: string; adminName: string; locale: "de" | "en"; theme?: ThemeSettings },
  actorId: string,
): Promise<CreateCommunityResult> {
  if (await getCommunityBySlug(input.slug)) return { ok: false, reason: "slug_taken" };
  const admin = await ensureUser({ email: input.adminEmail, name: input.adminName, locale: input.locale });
  const community = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(communities)
      .values({ name: input.name.trim(), slug: input.slug, defaultLocale: input.locale, theme: input.theme ?? DEFAULT_THEME, createdBy: actorId })
      .returning();
    await tx.insert(communityMembers).values({ communityId: row.id, userId: admin.id, role: "admin", status: "active" });
    return row;
  });
  await emit("member.joined", community.id, actorId, { userId: admin.id, via: "operator" });
  return { ok: true, community };
}

export async function updateCommunitySettings(
  communityId: string,
  patch: { name?: string; tagline?: string | null; theme?: ThemeSettings; defaultLocale?: "de" | "en" },
): Promise<Community | undefined> {
  const [row] = await db.update(communities).set(patch).where(eq(communities.id, communityId)).returning();
  return row;
}
