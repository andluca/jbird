import { z } from "zod";

/**
 * Semver string: MAJOR.MINOR.PATCH(-prerelease)?
 */
export const semverSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:-[\w.]+)?$/, "Invalid semver format");

/**
 * Valid TCP port number: 1-65535
 */
export const portSchema = z.number().int().min(1).max(65535);

/**
 * Non-empty file system path.
 * FS existence validation lives in @jbird/cli (layer above).
 */
export const pathSchema = z.string().min(1);

/**
 * ISO 8601 datetime string with timezone (e.g. 2026-05-03T12:00:00.000Z)
 */
export const isoTimestampSchema = z.iso.datetime();

/**
 * SHA-256 digest prefixed with 'sha256:' followed by 64 lowercase hex chars.
 * Example: sha256:abc123...
 */
export const sha256Schema = z
  .string()
  .regex(/^sha256:[0-9a-f]{64}$/, "Invalid sha256 format");
