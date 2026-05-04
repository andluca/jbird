import { dirname } from "node:path";
import { journalEventSchema } from "@jbird/core";
import type { JournalEvent } from "@jbird/core";
import type { Fs, Clock } from "./ports.ts";

/**
 * Appends NDJSON events to a journal file.
 *
 * Event timestamps are the caller's responsibility — JournalWriter does not
 * inject timestamps. This supports events from external sources (e.g. proxy)
 * that already carry their own timestamps.
 *
 * No rotation in v1. Append-only. Single file per log stream.
 */
export class JournalWriter {
  constructor(
    private readonly fs: Fs,
    private readonly _clock: Clock,
  ) {}

  async append(filePath: string, event: JournalEvent): Promise<void> {
    // Validate first — never write invalid events
    journalEventSchema.parse(event);

    const line = JSON.stringify(event) + "\n";
    await this.fs.mkdir(dirname(filePath));
    await this.fs.appendFile(filePath, line);
  }
}
