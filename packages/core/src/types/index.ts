import type { z } from "zod";
import type {
  bundleConfigSchema,
  bundleEntryKindSchema,
  bundleEntrySchema,
  bundleManifestSchema,
  classificationSchema,
  coreConfigSchema,
  errorBodySchema,
  healthResponseSchema,
  injectDirectiveSchema,
  journalEventSchema,
  managedManifestSchema,
  modelIdSchema,
  modelMetaSchema,
  normalizedRequestSchema,
  providerIdSchema,
  routingConfigSchema,
  routingDecisionSchema,
  routingReasonSchema,
  routingRuleSchema,
  servicesConfigSchema,
  upstreamChunkSchema,
  upstreamRequestSchema,
  usageSchema,
} from "../schemas/index.ts";

// ---- Routing types ----
export type ModelId = z.infer<typeof modelIdSchema>;
export type ProviderId = z.infer<typeof providerIdSchema>;
export type ModelMeta = z.infer<typeof modelMetaSchema>;
export type NormalizedRequest = z.infer<typeof normalizedRequestSchema>;
export type UpstreamRequest = z.infer<typeof upstreamRequestSchema>;
export type UpstreamChunk = z.infer<typeof upstreamChunkSchema>;
export type Usage = z.infer<typeof usageSchema>;
export type Classification = z.infer<typeof classificationSchema>;
export type RoutingReason = z.infer<typeof routingReasonSchema>;
export type InjectDirective = z.infer<typeof injectDirectiveSchema>;
export type RoutingDecision = z.infer<typeof routingDecisionSchema>;

// ---- Config types ----
export type ServicesConfig = z.infer<typeof servicesConfigSchema>;
export type RoutingConfig = z.infer<typeof routingConfigSchema>;
export type RoutingRule = z.infer<typeof routingRuleSchema>;
export type BundleConfig = z.infer<typeof bundleConfigSchema>;
export type CoreConfig = z.infer<typeof coreConfigSchema>;

// ---- Journal types ----
export type JournalEvent = z.infer<typeof journalEventSchema>;

// ---- IPC types ----
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ErrorBody = z.infer<typeof errorBodySchema>;

// ---- Bundle manifest types ----
export type BundleEntryKind = z.infer<typeof bundleEntryKindSchema>;
export type BundleEntry = z.infer<typeof bundleEntrySchema>;
export type BundleManifest = z.infer<typeof bundleManifestSchema>;
export type ManagedManifest = z.infer<typeof managedManifestSchema>;
