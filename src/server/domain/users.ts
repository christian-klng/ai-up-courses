import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users, type User } from "@/server/db/schema";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUserById(id: string): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.email, normalizeEmail(email)) });
}

/**
 * Returns the account for this address, creating an active one if there is none. The e-mail is the
 * account's identity (§3.3 rule 2), so an existing account is reused and its name left alone.
 */
export async function ensureUser(input: { email: string; name: string; locale: "de" | "en" }): Promise<User> {
  const email = normalizeEmail(input.email);
  const [created] = await db
    .insert(users)
    .values({ id: crypto.randomUUID(), email, name: input.name.trim(), locale: input.locale, status: "active" })
    .onConflictDoNothing({ target: users.email })
    .returning();
  if (created) return created;
  const existing = await getUserByEmail(email);
  if (!existing) throw new Error("user vanished after insert conflict");
  return existing;
}

export async function updateUserLocale(id: string, locale: "de" | "en"): Promise<void> {
  await db.update(users).set({ locale }).where(eq(users.id, id));
}
