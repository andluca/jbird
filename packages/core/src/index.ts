// Version constant
export { JBIRD_VERSION } from "./version.ts";

// Error classes
export {
  BundleError,
  ConfigError,
  IpcError,
  JbirdError,
  ProxyError,
  ServiceLifecycleError,
} from "./errors/index.ts";

// Logger interface
export type { LogFields, LogLevel, Logger } from "./logger/index.ts";

// Zod schemas (for validation at boundaries)
export {
  DEFAULT_PROXY_PORT,
  bundleConfigSchema,
  bundleEntryKindSchema,
  bundleEntrySchema,
  bundleManifestSchema,
  classificationSchema,
  clientVersionHeaderSchema,
  coreConfigSchema,
  errorBodySchema,
  healthRequestSchema,
  healthResponseSchema,
  injectDirectiveSchema,
  isoTimestampSchema,
  journalEventSchema,
  managedManifestSchema,
  modelIdSchema,
  modelMetaSchema,
  normalizedRequestSchema,
  pathSchema,
  portSchema,
  providerIdSchema,
  routingConfigSchema,
  routingDecisionSchema,
  routingReasonSchema,
  routingRuleSchema,
  semverSchema,
  servicesConfigSchema,
  sha256Schema,
  upstreamChunkSchema,
  upstreamRequestSchema,
  usageSchema,
} from "./schemas/index.ts";

// Inferred TypeScript types (use `import type` in consumers)
export type {
  BundleConfig,
  BundleEntry,
  BundleEntryKind,
  BundleManifest,
  Classification,
  CoreConfig,
  ErrorBody,
  HealthResponse,
  InjectDirective,
  JournalEvent,
  ManagedManifest,
  ModelId,
  ModelMeta,
  NormalizedRequest,
  ProviderId,
  RoutingConfig,
  RoutingDecision,
  RoutingReason,
  RoutingRule,
  ServicesConfig,
  UpstreamChunk,
  UpstreamRequest,
  Usage,
} from "./types/index.ts";
