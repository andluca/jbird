import { JbirdError } from "./jbird-error.ts";

/**
 * Thrown when the proxy encounters an error handling a request.
 *
 * details.kind subcategories:
 *   'upstream-unreachable'  — provider API did not respond
 *   'invalid-request'       — request failed schema validation
 *   'streaming-aborted'     — SSE stream terminated abnormally
 *   'auth-missing'          — required auth header not present
 */
export class ProxyError extends JbirdError {
  override readonly code = "proxy";
}
