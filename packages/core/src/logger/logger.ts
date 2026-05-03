/**
 * Log level for structured logging.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Arbitrary structured fields attached to a log entry.
 */
export type LogFields = Readonly<Record<string, unknown>>;

/**
 * Logger interface injected via constructor into all services.
 *
 * Concrete implementation lives in @jbird/cli/shared/integrations/ (issue 004).
 * This interface is the only contract @jbird/core defines — no I/O here.
 *
 * Design notes (ISP):
 * - Methods match the four standard log levels plus child() for context propagation.
 * - No additional methods (e.g. flush, rotate) — those are implementation concerns.
 */
export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  /**
   * Returns a child logger with additional bound fields
   * prepended to every log entry it produces.
   */
  child(bindings: LogFields): Logger;
}
