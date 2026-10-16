import { Worker } from "bullmq";
import { env } from "@/server/env";
import { logger } from "@/server/logger";
import { QUEUE_NAME, redisConnection, type JobData } from "@/server/queue/queues";
import { pool } from "@/server/db/client";

/**
 * Worker process (`npm run worker`, container target `worker`). Runs the jobs that must not block a
 * request: AI jurors and the navigator from phase B on.
 */
const worker = new Worker<JobData>(
  QUEUE_NAME,
  async (job) => {
    switch (job.data.kind) {
      case "ping":
        logger.info({ at: job.data.at }, "ping");
        return;
    }
  },
  { connection: redisConnection(), concurrency: env.WORKER_CONCURRENCY },
);

worker.on("failed", (job, err) => logger.error({ err, jobId: job?.id, kind: job?.data.kind }, "job failed"));
worker.on("ready", () => logger.info({ queue: QUEUE_NAME, concurrency: env.WORKER_CONCURRENCY }, "worker ready"));

async function shutdown(signal: string) {
  logger.info({ signal }, "worker shutting down");
  await worker.close();
  await pool.end();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
