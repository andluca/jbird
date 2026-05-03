import { JbirdError } from "./jbird-error.ts";

/**
 * Thrown when bundle materialization encounters an error.
 *
 * details.kind subcategories:
 *   'manifest-invalid'        — bundle manifest.json failed schema validation
 *   'source-missing'          — source file referenced in manifest not found
 *   'target-outside-managed'  — target path is outside the .jbird-managed scope
 *   'hash-mismatch'           — file hash does not match manifest entry
 */
export class BundleError extends JbirdError {
  override readonly code = "bundle";
}
