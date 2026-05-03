import { z } from "zod";
import { isoTimestampSchema } from "./primitives.ts";
import { classificationSchema, routingDecisionSchema } from "./routing.ts";

/**
 * Journal event: routing decision recorded by the proxy.
 */
const routingDecisionEventSchema = z.object({
  kind: z.literal("routing-decision"),
  timestamp: isoTimestampSchema,
  decision: routingDecisionSchema,
  classification: classificationSchema,
  latencyMs: z.number().int().nonnegative(),
  requestId: z.string().min(1),
});

/**
 * Journal event: CLI command invocation.
 */
const commandInvocationEventSchema = z.object({
  kind: z.literal("command-invocation"),
  timestamp: isoTimestampSchema,
  command: z.string().min(1),
  args: z.array(z.string()).readonly(),
  exitCode: z.number().int(),
  durationMs: z.number().int().nonnegative(),
});

/**
 * Journal event: bundle materialization operation.
 */
const materializationEventSchema = z.object({
  kind: z.literal("materialization"),
  timestamp: isoTimestampSchema,
  target: z.enum(["global", "project"]),
  changes: z
    .array(
      z.object({
        path: z.string().min(1),
        action: z.enum(["create", "update", "skip", "delete"]),
      }),
    )
    .readonly(),
});

/**
 * Journal event: proxy service lifecycle transition.
 */
const serviceLifecycleEventSchema = z.object({
  kind: z.literal("service-lifecycle"),
  timestamp: isoTimestampSchema,
  service: z.literal("proxy"),
  action: z.enum(["start", "stop", "crash-detected", "restart"]),
  pid: z.number().int().positive().optional(),
  version: z.string().optional(),
});

/**
 * Discriminated union of all journal event types.
 * Each event is self-contained and JSON-serializable (suitable for NDJSON lines).
 * Journal files live at ~/.jbird/logs/*.log (one line per event).
 */
export const journalEventSchema = z.discriminatedUnion("kind", [
  routingDecisionEventSchema,
  commandInvocationEventSchema,
  materializationEventSchema,
  serviceLifecycleEventSchema,
]);
