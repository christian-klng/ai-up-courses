import { db } from "@/server/db/client";
import { learnerEvents } from "@/server/db/schema";
import { logger } from "@/server/logger";

/**
 * Domain events (PLAN.md §3.3 rule 5). Domain code reports what happened through `emit()`, never by
 * writing `learner_events` itself – later a signed webhook to AI-Up hangs off this one function.
 *
 * The community travels in the envelope, explicitly, like everywhere else.
 */
export type DomainEvent = {
  "member.joined": { userId: string; via: "invite" | "operator" };
  "member.role_changed": { userId: string; role: "member" | "admin" };
  "member.suspended": { userId: string };
  "member.reactivated": { userId: string };
};

export type DomainEventType = keyof DomainEvent;

/** xAPI verb for each event type (§4 `learner_events`). */
const VERBS: Record<DomainEventType, string> = {
  "member.joined": "joined",
  "member.role_changed": "updated",
  "member.suspended": "suspended",
  "member.reactivated": "reactivated",
};

export async function emit<T extends DomainEventType>(type: T, communityId: string, actorId: string | null, payload: DomainEvent[T]): Promise<void> {
  try {
    await db.insert(learnerEvents).values({ communityId, type, actorId, verb: VERBS[type], object: payload as Record<string, unknown> });
  } catch (err) {
    // An event log write must never undo the action it reports.
    logger.error({ err, type, communityId }, "event log write failed");
  }
}
