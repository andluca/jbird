import { z } from "zod";
import { portSchema, semverSchema } from "./primitives.ts";
import { modelIdSchema, providerIdSchema } from "./routing.ts";

/**
 * NOTE: All schema keys use camelCase (TypeScript convention).
 * TOML files use snake_case (e.g. default_model, token_estimate_lt).
 * The translation between snake_case and camelCase happens in the
 * config loader (@jbird/cli, issue 004) — not here.
 */

/** Default port for the jbird proxy daemon (spec section 2.6). */
export const DEFAULT_PROXY_PORT = 7878;

/**
 * Proxy service configuration.
 */
const proxyServiceConfigSchema = z
  .object({
    autostart: z.boolean().default(true),
    port: portSchema.default(DEFAULT_PROXY_PORT),
  })
  .strict();

/**
 * Services section of jbird config.
 */
export const servicesConfigSchema = z
  .object({
    proxy: proxyServiceConfigSchema
      .optional()
      .default(() => proxyServiceConfigSchema.parse({})),
  })
  .strict();

/**
 * Match object for a routing rule.
 * All specified keys are AND-ed together.
 * OR-between-rules is expressed by multiple [[routing.rules]] TOML entries.
 *
 * toolUseDensity is intentionally absent here — it is an internal RoutingPolicy
 * heuristic and not a user-configurable match criterion in v1.
 *
 * At least one key must be defined (enforced by .refine).
 */
const routingRuleMatchSchema = z
  .object({
    tokenEstimateLt: z.number().int().positive().optional(),
    tokenEstimateGte: z.number().int().positive().optional(),
    containsAny: z.array(z.string().min(1)).readonly().optional(),
    isSubagent: z.boolean().optional(),
    hasRetrievedContext: z.boolean().optional(),
  })
  .refine(
    (obj) =>
      obj.tokenEstimateLt !== undefined ||
      obj.tokenEstimateGte !== undefined ||
      (obj.containsAny !== undefined && obj.containsAny.length > 0) ||
      obj.isSubagent !== undefined ||
      obj.hasRetrievedContext !== undefined,
    { message: "At least one match clause must be specified" },
  );

/**
 * A single routing rule: match conditions → target provider + model.
 */
export const routingRuleSchema = z
  .object({
    match: routingRuleMatchSchema,
    provider: providerIdSchema,
    model: modelIdSchema,
  })
  .strict();

/**
 * Routing section of jbird config.
 */
export const routingConfigSchema = z
  .object({
    defaultModel: modelIdSchema.default("sonnet"),
    rules: z.array(routingRuleSchema).readonly().default([]),
  })
  .strict();

/**
 * Bundle section of jbird config.
 */
export const bundleConfigSchema = z
  .object({
    version: semverSchema,
    profile: z.string().min(1).default("default"),
  })
  .strict();

/**
 * Full jbird configuration as loaded from config.toml.
 * Strict mode rejects any unrecognized keys (signals typos).
 *
 * TOML example (section 2.6):
 *   [services.proxy]
 *   autostart = true
 *   port = 7878
 *
 *   [routing]
 *   default_model = "sonnet"
 *
 *   [[routing.rules]]
 *   match = { token_estimate_lt = 500 }
 *   provider = "anthropic"
 *   model = "haiku"
 *
 *   [bundle]
 *   version = "0.1.0"
 *   profile = "default"
 */
export const coreConfigSchema = z
  .object({
    services: servicesConfigSchema
      .optional()
      .default(() => servicesConfigSchema.parse({})),
    routing: routingConfigSchema
      .optional()
      .default(() => routingConfigSchema.parse({})),
    bundle: bundleConfigSchema,
  })
  .strict();
