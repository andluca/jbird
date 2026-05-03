import { describe, expect, it } from "bun:test";
import {
  bundleConfigSchema,
  coreConfigSchema,
  routingConfigSchema,
  routingRuleSchema,
  servicesConfigSchema,
} from "./config.ts";

describe("servicesConfigSchema", () => {
  it("accepts valid services config", () => {
    const input = { proxy: { autostart: true, port: 7878 } };
    expect(servicesConfigSchema.parse(input)).toEqual(input);
  });

  it("applies defaults when proxy fields omitted", () => {
    const parsed = servicesConfigSchema.parse({ proxy: {} });
    expect(parsed.proxy.autostart).toBe(true);
    expect(parsed.proxy.port).toBe(7878);
  });
});

describe("routingRuleSchema", () => {
  it("accepts rule with single match clause", () => {
    const input = {
      match: { tokenEstimateLt: 500 },
      provider: "anthropic",
      model: "haiku",
    };
    expect(() => routingRuleSchema.parse(input)).not.toThrow();
  });

  it("accepts rule with combined AND match clauses", () => {
    const input = {
      match: { tokenEstimateLt: 500, containsAny: ["refactor"] },
      provider: "anthropic",
      model: "haiku",
    };
    expect(() => routingRuleSchema.parse(input)).not.toThrow();
  });

  it("rejects rule with empty match (no clause defined)", () => {
    const input = { match: {}, provider: "anthropic", model: "haiku" };
    expect(() => routingRuleSchema.parse(input)).toThrow();
  });

  it("rejects unknown model", () => {
    const input = {
      match: { tokenEstimateLt: 500 },
      provider: "anthropic",
      model: "gpt-4",
    };
    expect(() => routingRuleSchema.parse(input)).toThrow();
  });
});

describe("routingConfigSchema", () => {
  it("applies defaults when omitted", () => {
    const parsed = routingConfigSchema.parse({});
    expect(parsed.defaultModel).toBe("sonnet");
    expect(parsed.rules).toEqual([]);
  });

  it("accepts full config with rules", () => {
    const input = {
      defaultModel: "opus",
      rules: [
        {
          match: { tokenEstimateLt: 500 },
          provider: "anthropic",
          model: "haiku",
        },
      ],
    };
    expect(() => routingConfigSchema.parse(input)).not.toThrow();
  });
});

describe("bundleConfigSchema", () => {
  it("accepts valid bundle config", () => {
    const input = { version: "0.1.0", profile: "default" };
    expect(bundleConfigSchema.parse(input)).toEqual(input);
  });

  it("applies profile default", () => {
    const parsed = bundleConfigSchema.parse({ version: "0.1.0" });
    expect(parsed.profile).toBe("default");
  });
});

describe("coreConfigSchema", () => {
  const fullConfig = {
    services: { proxy: { autostart: true, port: 7878 } },
    routing: {
      defaultModel: "sonnet",
      rules: [
        {
          match: { tokenEstimateLt: 500 },
          provider: "anthropic",
          model: "haiku",
        },
      ],
    },
    bundle: { version: "0.1.0", profile: "default" },
  };

  it("round-trip with full config fixture (spec section 2.6)", () => {
    const parsed = coreConfigSchema.parse(fullConfig);
    const reparsed = coreConfigSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(reparsed).toEqual(parsed);
  });

  it("applies defaults for minimal input", () => {
    const parsed = coreConfigSchema.parse({
      bundle: { version: "0.1.0" },
    });
    expect(parsed.services.proxy.autostart).toBe(true);
    expect(parsed.services.proxy.port).toBe(7878);
    expect(parsed.routing.defaultModel).toBe("sonnet");
    expect(parsed.routing.rules).toEqual([]);
    expect(parsed.bundle.profile).toBe("default");
  });

  it("strict mode rejects unknown top-level keys", () => {
    expect(() =>
      coreConfigSchema.parse({ ...fullConfig, foo: "bar" }),
    ).toThrow();
  });

  it("strict mode rejects unknown nested keys", () => {
    expect(() =>
      coreConfigSchema.parse({
        ...fullConfig,
        services: { proxy: { autostart: true, port: 7878, extra: "field" } },
      }),
    ).toThrow();
  });
});
