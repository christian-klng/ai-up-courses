import { Queue } from "bullmq";
import { env } from "@/server/env";

/**
 * Background jobs (PLAN.md §3.1): AI verdicts and navigator calls run in the worker, never in a
 * request. Phase 0 only sets up the plumbing; job kinds arrive with phases B and C.
 *
 * BullMQ job ids must not contain ":".
 */
export const QUEUE_NAME = "courses";

export type JobData = { kind: "ping"; at: string };

export function redisConnection() {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : undefined,
    maxRetriesPerRequest: null,
  };
}

const globalForQueue = globalThis as unknown as { __coursesQueue?: Queue<JobData> };

export function getQueue(): Queue<JobData> {
  globalForQueue.__coursesQueue ??= new Queue<JobData>(QUEUE_NAME, { connection: redisConnection() });
  return globalForQueue.__coursesQueue;
}
