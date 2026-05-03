import { z } from "zod";
import { isoTimestampSchema, pathSchema, semverSchema, sha256Schema } from "./primitives.ts";

/**
 * Types of artifacts that can be part of a bundle.
 */
export const bundleEntryKindSchema = z.enum([
  "mcp",
  "hook",
  "skill",
  "subagent",
  "rule",
  "slash-command",
  "settings-fragment",
]);

/**
 * A single entry in the bundle manifest describing one artifact.
 */
export const bundleEntrySchema = z.object({
  kind: bundleEntryKindSchema,
  /** Path relative to bundle root */
  source: pathSchema,
  target: z.object({
    scope: z.enum(["global", "project"]),
    /** Path relative to the target .claude/ directory */
    path: pathSchema,
  }),
  sha256: sha256Schema,
  version: semverSchema,
});

/**
 * Top-level bundle manifest shipped with @jbird/bundle.
 * Lists all artifacts that can be materialized into .claude/ directories.
 */
export const bundleManifestSchema = z.object({
  version: semverSchema,
  entries: z.array(bundleEntrySchema).readonly(),
});

/**
 * Schema for the .jbird-managed manifest written by BundleMaterializer
 * into each .claude/ directory it manages.
 * Used to track ownership and detect manual modifications.
 */
export const managedManifestSchema = z.object({
  version: semverSchema,
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        sha256: sha256Schema,
        kind: bundleEntryKindSchema,
      }),
    )
    .readonly(),
  writtenAt: isoTimestampSchema,
});
