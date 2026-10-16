import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/server/env";
import * as schema from "./schema";

/**
 * Shared PostgreSQL pool + drizzle client.
 * A single instance is kept on globalThis so Next.js dev HMR does not leak connections.
 */
const globalForDb = globalThis as unknown as { __coursesPool?: Pool };

export const pool =
  globalForDb.__coursesPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
  });

if (env.NODE_ENV !== "production") globalForDb.__coursesPool = pool;

export const db = drizzle({ client: pool, schema, casing: "snake_case" });
export type Db = typeof db;
export { schema };
