import { describe, expect, it } from "bun:test";
import { journalEventSchema } from "./journal.ts";

const TIMESTAMP = "2026-05-03T12:00:00.000Z";

describe("journalEventSchema", () => {
  describe("routing-decision variant", () => {
    const fixture = {
      kind: "routing-decision",
      timestamp: TIMESTAMP,
      decision: {
        chosenProviderId: "anthropic",
        chosenModel: "sonnet",
        originalRequestedModel: "claude-sonnet-4-5",
        reason: "default-sonnet",
        injectDirectives: [],
        decidedAt: TIMESTAMP,
      },
      classification: {
        tokenEstimate: 1200,
        hasArchitecturalKeywords: false,
        hasRetrievedContext: false,
        isSubagent: false,
        toolUseDensity: 0.1,
      },
      latencyMs: 15,
      requestId: "req-abc-123",
    };

    it("round-trip via JSON", () => {
      const parsed = journalEventSchema.parse(fixture);
      const reparsed = journalEventSchema.parse(
        JSON.parse(JSON.stringify(parsed)),
      );
      expect(reparsed).toEqual(parsed);
    });

    it("NDJSON stringify-then-parse preserves identity", () => {
      const parsed = journalEventSchema.parse(fixture);
      const ndjsonLine = JSON.stringify(parsed);
      const reparsed = journalEventSchema.parse(JSON.parse(ndjsonLine));
      expect(reparsed).toEqual(parsed);
    });
  });

  describe("command-invocation variant", () => {
    const fixture = {
      kind: "command-invocation",
      timestamp: TIMESTAMP,
      command: "init",
      args: ["--no-index"],
      exitCode: 0,
      durationMs: 1200,
    };

    it("round-trip via JSON", () => {
      const parsed = journalEventSchema.parse(fixture);
      const reparsed = journalEventSchema.parse(
        JSON.parse(JSON.stringify(parsed)),
      );
      expect(reparsed).toEqual(parsed);
    });
  });

  describe("materialization variant", () => {
    const fixture = {
      kind: "materialization",
      timestamp: TIMESTAMP,
      target: "project",
      changes: [
        { path: ".claude/skills/tdd.md", action: "create" },
        { path: ".claude/rules/jbird.md", action: "update" },
        { path: ".claude/settings.json", action: "skip" },
      ],
    };

    it("round-trip via JSON", () => {
      const parsed = journalEventSchema.parse(fixture);
      const reparsed = journalEventSchema.parse(
        JSON.parse(JSON.stringify(parsed)),
      );
      expect(reparsed).toEqual(parsed);
    });

    it("accepts all action types", () => {
      const actions = ["create", "update", "skip", "delete"] as const;
      for (const action of actions) {
        expect(() =>
          journalEventSchema.parse({
            ...fixture,
            changes: [{ path: ".claude/test.md", action }],
          }),
        ).not.toThrow();
      }
    });
  });

  describe("service-lifecycle variant", () => {
    const fixture = {
      kind: "service-lifecycle",
      timestamp: TIMESTAMP,
      service: "proxy",
      action: "start",
      pid: 12345,
      version: "0.1.0",
    };

    it("round-trip via JSON with optional fields", () => {
      const parsed = journalEventSchema.parse(fixture);
      const reparsed = journalEventSchema.parse(
        JSON.parse(JSON.stringify(parsed)),
      );
      expect(reparsed).toEqual(parsed);
    });

    it("round-trip without optional pid and version", () => {
      const minimal = {
        kind: "service-lifecycle",
        timestamp: TIMESTAMP,
        service: "proxy",
        action: "crash-detected",
      };
      const parsed = journalEventSchema.parse(minimal);
      const reparsed = journalEventSchema.parse(
        JSON.parse(JSON.stringify(parsed)),
      );
      expect(reparsed).toEqual(parsed);
    });

    it("accepts all action types", () => {
      const actions = ["start", "stop", "crash-detected", "restart"] as const;
      for (const action of actions) {
        expect(() =>
          journalEventSchema.parse({ ...fixture, action }),
        ).not.toThrow();
      }
    });
  });

  it("rejects unknown kind", () => {
    expect(() =>
      journalEventSchema.parse({
        kind: "unknown-event",
        timestamp: TIMESTAMP,
      }),
    ).toThrow();
  });
});
