import type { Logger, LogFields } from "@jbird/core";

const LEVELS = ["debug", "info", "warn", "error"] as const;
type Level = (typeof LEVELS)[number];

function formatMessage(level: string, message: string, fields?: LogFields): string {
  const base = `[${level}] ${message}`;
  if (fields === undefined || Object.keys(fields).length === 0) return base;
  return `${base} ${JSON.stringify(fields)}`;
}

/**
 * Logger implementation that writes to stderr.
 * Never uses console.log. Respects ESLint no-console rule.
 */
export function createConsoleLogger(minLevel: Level = "info", bindings?: LogFields): Logger {
  const minIdx = LEVELS.indexOf(minLevel);

  function write(level: Level, message: string, fields?: LogFields): void {
    if (LEVELS.indexOf(level) < minIdx) return;
    const merged: LogFields = { ...bindings, ...fields };
    process.stderr.write(formatMessage(level, message, Object.keys(merged).length > 0 ? merged : undefined) + "\n");
  }

  return {
    debug(message: string, fields?: LogFields): void {
      write("debug", message, fields);
    },
    info(message: string, fields?: LogFields): void {
      write("info", message, fields);
    },
    warn(message: string, fields?: LogFields): void {
      write("warn", message, fields);
    },
    error(message: string, fields?: LogFields): void {
      write("error", message, fields);
    },
    child(childBindings: LogFields): Logger {
      return createConsoleLogger(minLevel, { ...bindings, ...childBindings });
    },
  };
}
