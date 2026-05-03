import { z } from "zod";
import { isoTimestampSchema } from "./primitives.ts";

/**
 * Model identifiers supported in v1 (Anthropic-only).
 * v2 may add Qwen models — extend this enum when providers expand.
 */
export const modelIdSchema = z.enum(["opus", "sonnet", "haiku"]);

/**
 * Provider identifier: string-open so v2 can add 'qwen' without breaking type.
 * v1 always uses 'anthropic'.
 */
export const providerIdSchema = z.string().min(1);

/**
 * Model metadata as registered by a ModelProvider.
 */
export const modelMetaSchema = z.object({
  id: modelIdSchema,
  providerId: providerIdSchema,
  displayName: z.string().min(1),
  contextWindow: z.number().int().positive(),
  supportsThinking: z.boolean(),
});

/**
 * Subset of the Anthropic Messages API request, normalized for routing decisions.
 * Only fields consumed by RoutingPolicy: token estimation, keyword detection,
 * header-based passthrough, subagent/context metadata.
 */
export const normalizedRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.union([
        z.string(),
        z.array(z.record(z.string(), z.unknown())),
      ]),
    }),
  ),
  system: z.string().optional(),
  tools: z.array(z.record(z.string(), z.unknown())).optional(),
  /** Original model string as requested by the client (e.g. 'claude-sonnet-4-5') */
  model: z.string().min(1),
  metadata: z
    .object({
      isSubagent: z.boolean().optional(),
      hasRetrievedContext: z.boolean().optional(),
    })
    .optional(),
  /** All request headers (includes X-Jbird-Route for passthrough opt-out) */
  headers: z.record(z.string(), z.string()),
});

/**
 * Upstream request forwarded to the provider.
 * Body is kept as unknown — proxy passes through without deep validation.
 */
export const upstreamRequestSchema = z.object({
  url: z.url(),
  method: z.literal("POST"),
  headers: z.record(z.string(), z.string()),
  body: z.unknown(),
});

/**
 * A single SSE event line from the upstream provider.
 * Opaque pass-through — proxy does not parse Anthropic SSE structure.
 * If issue 007 requires structured parsing, this schema will expand.
 */
export const upstreamChunkSchema = z.object({
  raw: z.string(),
});

/**
 * Token usage reported by the upstream provider.
 * Cache fields are optional — not all requests use prompt caching.
 */
export const usageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheCreationInputTokens: z.number().int().nonnegative().optional(),
  cacheReadInputTokens: z.number().int().nonnegative().optional(),
});

/**
 * Request classification computed by RoutingPolicy.
 * toolUseDensity is internal heuristic — NOT exposed as a user-facing match clause
 * in routingRuleSchema.match (v1). Only consumed by RoutingPolicy heuristics.
 */
export const classificationSchema = z.object({
  tokenEstimate: z.number().int().nonnegative(),
  hasArchitecturalKeywords: z.boolean(),
  hasRetrievedContext: z.boolean(),
  isSubagent: z.boolean(),
  toolUseDensity: z.number().min(0).max(1),
});

/**
 * Enumeration of reasons for a routing decision.
 * Exhaustive in v1 — adding a new reason requires updating this enum
 * and all downstream switches.
 */
export const routingReasonSchema = z.enum([
  "subagent-downgrade",
  "small-prompt-haiku",
  "architectural-keywords-opus",
  "rag-context-haiku",
  "default-sonnet",
  "config-rule-match",
  "passthrough-header",
]);

/**
 * Directives injected into the upstream request by the proxy.
 * Closed enum in v1 — adding a directive requires a PR updating this enum
 * plus all switches that handle it.
 */
export const injectDirectiveSchema = z.enum(["use-sequential-thinking-mcp"]);

/**
 * The final routing decision produced by RoutingPolicy for a given request.
 * Carries everything needed for journal logging and upstream forwarding.
 */
export const routingDecisionSchema = z.object({
  chosenProviderId: providerIdSchema,
  chosenModel: modelIdSchema,
  /** Original model string from the client request (before routing override) */
  originalRequestedModel: z.string().min(1),
  reason: routingReasonSchema,
  injectDirectives: z.array(injectDirectiveSchema).readonly(),
  decidedAt: isoTimestampSchema,
});
