import { describe, expect, it } from "bun:test";
import { errorBodySchema, healthResponseSchema } from "./ipc.ts";

const TIMESTAMP = "2026-05-03T12:00:00.000Z";

describe("errorBodySchema", () => {
  it("round-trip with code and message", () => {
    const fixture = {
      error: { code: "proxy", message: "Upstream unreachable" },
    };
    const parsed = errorBodySchema.parse(fixture);
    const reparsed = errorBodySchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(reparsed).toEqual(parsed);
  });

  it("round-trip with optional details", () => {
    const fixture = {
      error: {
        code: "config",
        message: "Validation failed",
        details: { kind: "validation-failed", field: "port" },
      },
    };
    const parsed = errorBodySchema.parse(fixture);
    const reparsed = errorBodySchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(reparsed).toEqual(parsed);
    expect(reparsed.error.details).toBeDefined();
  });

  it("round-trip without details (optional absent)", () => {
    const fixture = { error: { code: "ipc", message: "Schema validation error" } };
    const parsed = errorBodySchema.parse(fixture);
    expect(parsed.error.details).toBeUndefined();
  });

  it("rejects missing code", () => {
    expect(() =>
      errorBodySchema.parse({ error: { message: "oops" } }),
    ).toThrow();
  });

  it("rejects missing message", () => {
    expect(() =>
      errorBodySchema.parse({ error: { code: "proxy" } }),
    ).toThrow();
  });
});

describe("healthResponseSchema", () => {
  const fixture = {
    ok: true,
    version: "0.1.0",
    port: 7878,
    startedAt: TIMESTAMP,
    pid: 12345,
  };

  it("round-trip with full fixture", () => {
    const parsed = healthResponseSchema.parse(fixture);
    const reparsed = healthResponseSchema.parse(
      JSON.parse(JSON.stringify(parsed)),
    );
    expect(reparsed).toEqual(parsed);
  });

  it("rejects port 0", () => {
    expect(() =>
      healthResponseSchema.parse({ ...fixture, port: 0 }),
    ).toThrow();
  });

  it("rejects invalid version", () => {
    expect(() =>
      healthResponseSchema.parse({ ...fixture, version: "not-semver" }),
    ).toThrow();
  });

  it("rejects non-positive pid", () => {
    expect(() =>
      healthResponseSchema.parse({ ...fixture, pid: 0 }),
    ).toThrow();
  });
});

describe("errorBodySchema cross-test with JbirdError", () => {
  it("toJSON() output from JbirdError shape parses correctly", async () => {
    // Import ConfigError to test cross-compatibility
    const { ConfigError } = await import("../errors/config-error.ts");
    const err = new ConfigError("Validation failed", { kind: "validation-failed" });
    const json = err.toJSON();
    // Wrap in errorBodySchema envelope
    const parsed = errorBodySchema.parse({ error: json });
    expect(parsed.error.code).toBe("config");
    expect(parsed.error.message).toBe("Validation failed");
  });
});
