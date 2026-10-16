import IORedis, { type Redis } from "ioredis";
import { env } from "@/server/env";
import { logger } from "@/server/logger";

/**
 * Shared Redis connections. One command connection per process (publish, cache, rate limits);
 * subscriber connections are created per SSE stream because a subscribed ioredis client
 * cannot issue regular commands.
 */
const globalForRedis = globalThis as unknown as { __coursesRedis?: Redis };

export function getRedis(): Redis {
  if (!globalForRedis.__coursesRedis) {
    const client = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: 2, enableOfflineQueue: true, lazyConnect: false });
    client.on("error", (err) => logger.warn({ err: err.message }, "redis error"));
    globalForRedis.__coursesRedis = client;
  }
  return globalForRedis.__coursesRedis;
}

export function createSubscriber(): Redis {
  const client = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  client.on("error", (err) => logger.warn({ err: err.message }, "redis subscriber error"));
  return client;
}
