import { describe, expect, it } from "bun:test";
import {
  classificationSchema,
  modelIdSchema,
  routingDecisionSchema,
  usageSchema,
} from "./routing.ts";

describe("modelIdSchema", () => {
  it("accepts 'opus'", () => {
    expect(modelIdSchema.parse("opus")).toBe("opus");
  });

  it("accepts 'sonnet'", () => {
    expect(modelIdSchema.parse("sonnet")).toBe("sonnet");
  });

  it("accepts 'haiku'", () => {
    expect(modelIdSchema.parse("haiku")).toBe("haiku");
  });

  it("rejects 'gpt-4'", () => {
    expect(() => modelIdSchema.parse("gpt-4")).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => modelIdSchema.parse("")).toThrow();
  });
});

describe("routingDecisionSchema", () => {
  const sonnetDecision = {
    chosenProviderId: "anthropic",
    chosenModel: "sonnet",
    originalRequestedModel: "claude-sonnet-4-5",
    reason: "default-sonnet",
    injectDirectives: ["use-sequential-thinking-mcp"],
    decidedAt: "2026-05-03T12:00:00.000Z",
  };

  it("round-trip: Sonnet decision with injectDirective", () => {
    const parsed = routingDecisionSchema.parse(sonnetDecision);
    const reparsed = routingDecisionSchema.parse(
      JSON.parse(JSON.stringify(parsed)),
    );
    expect(reparsed).toEqual(parsed);
  });

  const opusDecision = {
    chosenProviderId: "anthropic",
    chosenModel: "opus",
    originalRequestedModel: "claude-opus-4",
    reason: "architectural-keywords-opus",
    injectDirectives: [],
    decidedAt: "2026-05-03T12:00:00.000Z",
  };

  it("round-trip: Opus decision with empty injectDirectives", () => {
    const parsed = routingDecisionSchema.parse(opusDecision);
    const reparsed = routingDecisionSchema.parse(
      JSON.parse(JSON.stringify(parsed)),
    );
    expect(reparsed).toEqual(parsed);
    expect(reparsed.injectDirectives).toHaveLength(0);
  });

  it("accepts all valid routingReason values", () => {
    const reasons = [
      "subagent-downgrade",
      "small-prompt-haiku",
      "architectural-keywords-opus",
      "rag-context-haiku",
      "default-sonnet",
      "config-rule-match",
      "passthrough-header",
    ] as const;

    for (const reason of reasons) {
      expect(() =>
        routingDecisionSchema.parse({ ...opusDecision, reason }),
      ).not.toThrow();
    }
  });

  it("rejects invalid reason", () => {
    expect(() =>
      routingDecisionSchema.parse({ ...opusDecision, reason: "unknown-reason" }),
    ).toThrow();
  });

  it("rejects invalid injectDirective", () => {
    expect(() =>
      routingDecisionSchema.parse({
        ...opusDecision,
        injectDirectives: ["unknown-directive"],
      }),
    ).toThrow();
  });
});

describe("classificationSchema", () => {
  const fixture = {
    tokenEstimate: 1500,
    hasArchitecturalKeywords: true,
    hasRetrievedContext: false,
    isSubagent: false,
    toolUseDensity: 0.3,
  };

  it("round-trip with realistic classification", () => {
    const parsed = classificationSchema.parse(fixture);
    const reparsed = classificationSchema.parse(
      JSON.parse(JSON.stringify(parsed)),
    );
    expect(reparsed).toEqual(parsed);
  });
});

describe("usageSchema", () => {
  it("round-trip with all fields", () => {
    const fixture = {
      inputTokens: 1000,
      outputTokens: 500,
      cacheCreationInputTokens: 100,
      cacheReadInputTokens: 200,
    };
    const parsed = usageSchema.parse(fixture);
    const reparsed = usageSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(reparsed).toEqual(parsed);
  });

  it("round-trip with only required fields (optional absent)", () => {
    const fixture = { inputTokens: 100, outputTokens: 50 };
    const parsed = usageSchema.parse(fixture);
    const reparsed = usageSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(reparsed).toEqual(parsed);
    expect(reparsed.cacheCreationInputTokens).toBeUndefined();
    expect(reparsed.cacheReadInputTokens).toBeUndefined();
  });
});
