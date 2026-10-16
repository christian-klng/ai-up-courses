import { boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/**
 * Database schema. Column names are snake_case via `casing: "snake_case"` on the drizzle client.
 *
 * Prepared for the later AI-Up link (PLAN.md §3.3): every id is a UUID, `users` and `communities`
 * carry a nullable `external_ref` (later `aiup:<id>`), and domain tables only ever reference the
 * internal ids.
 */

export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);
export const localeEnum = pgEnum("locale", ["de", "en"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ---------------------------------------------------------------------------
// Identity (Better Auth core tables + our extensions)
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    /** Unique per account: the first AI-Up sign-in links the existing account through it (§3.3). */
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    // --- our extensions ---
    /** `active` = may sign in at all; what someone may do inside a community is `community_members`. */
    status: userStatusEnum("status").notNull().default("active"),
    locale: localeEnum("locale").notNull().default("de"),
    externalRef: text("external_ref"),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), uniqueIndex("users_external_ref_idx").on(t.externalRef)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("sessions_token_idx").on(t.token), index("sessions_user_idx").on(t.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("accounts_user_idx").on(t.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    /** text, not uuid: Better Auth also looks rows up by a derived key that is no UUID. Auth plumbing only. */
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

// ---------------------------------------------------------------------------
// Communities (tenants)
// ---------------------------------------------------------------------------

export type ThemeSettings = {
  /** Primary brand color as hex, e.g. "#2563eb" */
  primaryColor: string;
  /** Border radius in rem */
  radius: number;
  /** Default color mode */
  mode: "light" | "dark" | "system";
};

export const DEFAULT_THEME: ThemeSettings = { primaryColor: "#2563eb", radius: 0.5, mode: "system" };

export const communities = pgTable(
  "communities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** url segment for /c/<slug>/… */
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline"),
    theme: jsonb("theme").$type<ThemeSettings>().notNull().default(DEFAULT_THEME),
    defaultLocale: localeEnum("default_locale").notNull().default("de"),
    /** Later `aiup:<community id>` – the AI-Up community this one is mapped to (§3.3, §11). */
    externalRef: text("external_ref"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("communities_slug_idx").on(t.slug), uniqueIndex("communities_external_ref_idx").on(t.externalRef)],
);

export const memberRoleEnum = pgEnum("member_role", ["member", "admin"]);
export const memberStatusEnum = pgEnum("member_status", ["active", "suspended"]);

/**
 * Membership of one account in one community – the only place that says what someone may do there.
 * Read exclusively through `roleIn()` (domain/communities.ts), so that the later switch to the role
 * claim of an AI-Up token touches one function (§3.3).
 */
export const communityMembers = pgTable(
  "community_members",
  {
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    status: memberStatusEnum("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.communityId, t.userId] }), index("community_members_user_idx").on(t.userId)],
);

/**
 * The join link of a community (one per community, admins only, off by default). There is no open
 * registration: anyone holding an enabled link becomes an active member – the admin vouches for the
 * link by switching it on. Switching it off keeps the token.
 */
export const communityInvites = pgTable(
  "community_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    /** URL-safe random secret; the public URL is /join/<token> */
    token: text("token").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    useCount: integer("use_count").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("community_invites_token_idx").on(t.token), uniqueIndex("community_invites_community_idx").on(t.communityId)],
);

// ---------------------------------------------------------------------------
// Domain events (§3.3 rule 5): an xAPI-style log written by `emit()`. Later a webhook to AI-Up
// hangs off the same bus.
// ---------------------------------------------------------------------------

export const learnerEvents = pgTable(
  "learner_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    /** e.g. "member.joined", "requirement.satisfied" */
    type: text("type").notNull(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    /** xAPI-ish: what the actor did to which object, with which result */
    verb: text("verb").notNull(),
    object: jsonb("object").$type<Record<string, unknown>>().notNull().default({}),
    result: jsonb("result").$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("learner_events_community_idx").on(t.communityId, t.occurredAt), index("learner_events_actor_idx").on(t.actorId)],
);

export type User = typeof users.$inferSelect;
export type Community = typeof communities.$inferSelect;
export type CommunityMember = typeof communityMembers.$inferSelect;
export type CommunityInvite = typeof communityInvites.$inferSelect;
export type MemberRole = (typeof memberRoleEnum.enumValues)[number];
export type LearnerEvent = typeof learnerEvents.$inferSelect;
