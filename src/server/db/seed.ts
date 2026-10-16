import { env } from "@/server/env";
import type { Db } from "./client";
import { users } from "./schema";

/**
 * Idempotent baseline data. Communities are created by the operator on /operator, so the only thing
 * seeded is an active account for every address in OPERATOR_EMAILS – otherwise nobody could sign in
 * on a fresh installation.
 *
 * Console only (no pino): this file is bundled into dist/migrate.js, which runs without node_modules.
 */
export async function seed(db: Db): Promise<void> {
  for (const email of env.OPERATOR_EMAILS) {
    const inserted = await db
      .insert(users)
      .values({ id: crypto.randomUUID(), email, name: email.split("@")[0] ?? email, emailVerified: true, status: "active", locale: env.DEFAULT_LOCALE })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id });
    if (inserted.length) console.log(`[seed] operator account created for ${email}`);
  }
}
