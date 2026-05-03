import { JbirdError } from "./jbird-error.ts";

/**
 * Thrown when IPC communication between CLI and proxy fails.
 *
 * details.kind subcategories:
 *   'version-mismatch'    — client version incompatible with proxy version
 *   'schema-validation'   — request or response body failed schema validation
 *   'transport'           — network-level error (connection refused, timeout)
 */
export class IpcError extends JbirdError {
  override readonly code = "ipc";
}
