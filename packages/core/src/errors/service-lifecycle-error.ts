import { JbirdError } from "./jbird-error.ts";

/**
 * Thrown when service supervision encounters a lifecycle error.
 *
 * details.kind subcategories:
 *   'spawn-failed'            — child process failed to start
 *   'health-check-timeout'    — proxy did not become healthy in time
 *   'orphan-info-file'        — proxy.info file found but process not running
 *   'already-running'         — attempted start but proxy already running
 *   'not-running'             — attempted stop but proxy not running
 */
export class ServiceLifecycleError extends JbirdError {
  override readonly code = "service-lifecycle";
}
