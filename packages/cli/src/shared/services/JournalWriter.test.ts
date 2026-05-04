import { describe, expect, it } from "bun:test";
import { JournalWriter } from "./JournalWriter.ts";
import { journalEventSchema } from "@jbird/core";
import type { Fs, Clock } from "./ports.ts";
import type { JournalEvent } from "@jbird/core";

// ─── Test doubles ─────────────────────────────────────────────────────────────

interface FakeAppendState {
  calls: { path: string; content: string }[];
  mkdirCalls: string[];
}

function makeFakeFs(): { fs: Fs; state: FakeAppendState } {
  const state: FakeAppendState = { calls: [], mkdirCalls: [] };
  const fs: Fs = {
    readFile(): Promise<string | null> { return Promise.resolve(null); },
    writeFile(): Promise<void> { return Promise.resolve(); },
    appendFile(path: string, content: string): Promise<void> {
      state.calls.push({ path, content });
      return Promise.resolve();
    },
    mkdir(path: string): Promise<void> {
      state.mkdirCalls.push(path);
      return Promise.resolve();
    },
    exists(): Promise<boolean> { return Promise.resolve(false); },
    chmod(): Promise<void> { return Promise.resolve(); },
    homedir() { return "/home/user"; },
  };
  return { fs, state };
}

function makeClock(isoDate = "2026-01-01T00:00:00.000Z"): Clock {
  return { now: () => new Date(isoDate) };
}

const VALID_EVENT: JournalEvent = {
  kind: "command-invocation",
  timestamp: "2026-01-01T00:00:00.000Z",
  command: "config",
  args: ["get", "proxy.port"],
  exitCode: 0,
  durationMs: 42,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("JournalWriter.append", () => {
  it("appends a valid event as a NDJSON line", async () => {
    const { fs, state } = makeFakeFs();
    const writer = new JournalWriter(fs, makeClock());

    await writer.append("/tmp/journal.ndjson", VALID_EVENT);

    expect(state.calls.length).toBe(1);
    const line = state.calls[0]?.content ?? "";
    expect(line.endsWith("\n")).toBe(true);
    const parsed = JSON.parse(line.trimEnd()) as unknown;
    expect(journalEventSchema.safeParse(parsed).success).toBe(true);
  });

  it("multiple appends produce multiple lines each parseable", async () => {
    const { fs, state } = makeFakeFs();
    const writer = new JournalWriter(fs, makeClock());

    await writer.append("/tmp/journal.ndjson", VALID_EVENT);
    await writer.append("/tmp/journal.ndjson", { ...VALID_EVENT, command: "tdd" });

    expect(state.calls.length).toBe(2);
    for (const call of state.calls) {
      const parsed = JSON.parse(call.content.trimEnd()) as unknown;
      expect(journalEventSchema.safeParse(parsed).success).toBe(true);
    }
  });

  it("throws before writing when event is invalid (missing kind)", async () => {
    const { fs, state } = makeFakeFs();
    const writer = new JournalWriter(fs, makeClock());

    const invalid = { timestamp: "2026-01-01T00:00:00.000Z", command: "test" };
    let threw = false;
    try {
      await writer.append("/tmp/journal.ndjson", invalid as JournalEvent);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(state.calls.length).toBe(0);
  });

  it("creates parent directory if it does not exist", async () => {
    const { fs, state } = makeFakeFs();
    const writer = new JournalWriter(fs, makeClock());

    await writer.append("/tmp/.jbird/logs/journal.ndjson", VALID_EVENT);

    expect(state.mkdirCalls.some((p) => p.includes("/tmp/.jbird/logs"))).toBe(true);
  });

  it("preserves the timestamp provided by the caller in the event", async () => {
    const { fs, state } = makeFakeFs();
    const writer = new JournalWriter(fs, makeClock("2026-05-01T12:00:00.000Z"));

    await writer.append("/tmp/journal.ndjson", VALID_EVENT);

    const line = state.calls[0]?.content ?? "";
    const parsed = JSON.parse(line.trimEnd()) as Record<string, unknown>;
    // Event timestamp is the caller's, not the clock's
    expect(parsed.timestamp).toBe(VALID_EVENT.timestamp);
  });
});
