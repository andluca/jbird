import { z } from "zod";
import { isoTimestampSchema, portSchema, semverSchema } from "./primitives.ts";

/**
 * Error envelope returned by all IPC endpoints on failure.
 * Matches the shape produced by JbirdError.toJSON() (see @jbird/core/errors).
 * Section 2.9: { error: { code, message, details? } }
 */
export const errorBodySchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional(),
  }),
});

/**
 * Semver-formatted client version sent in X-Jbird-Client-Version header.
 */
export const clientVersionHeaderSchema = semverSchema;

/**
 * Health check request body — intentionally empty.
 * Endpoint: GET /health (no body expected).
 */
export const healthRequestSchema = z.object({}).strict();

/**
 * Health check response body.
 * Returned by proxy when alive and ready to handle routing.
 */
export const healthResponseSchema = z.object({
  ok: z.boolean(),
  version: semverSchema,
  port: portSchema,
  startedAt: isoTimestampSchema,
  pid: z.number().int().positive(),
});
