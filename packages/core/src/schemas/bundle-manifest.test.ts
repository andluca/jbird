import { describe, expect, it } from "bun:test";
import {
  bundleManifestSchema,
  managedManifestSchema,
} from "./bundle-manifest.ts";

const TIMESTAMP = "2026-05-03T12:00:00.000Z";
const SHA256 = "sha256:" + "a".repeat(64);

describe("bundleManifestSchema", () => {
  it("round-trip with zero entries", () => {
    const fixture = { version: "0.1.0", entries: [] };
    const parsed = bundleManifestSchema.parse(fixture);
    const reparsed = bundleManifestSchema.parse(
      JSON.parse(JSON.stringify(parsed)),
    );
    expect(reparsed).toEqual(parsed);
  });

  it("round-trip with one entry", () => {
    const fixture = {
      version: "0.1.0",
      entries: [
        {
          kind: "skill",
          source: "skills/tdd.md",
          target: { scope: "global", path: "skills/tdd.md" },
          sha256: SHA256,
          version: "0.1.0",
        },
      ],
    };
    const parsed = bundleManifestSchema.parse(fixture);
    const reparsed = bundleManifestSchema.parse(
      JSON.parse(JSON.stringify(parsed)),
    );
    expect(reparsed).toEqual(parsed);
  });

  it("round-trip with multiple entry kinds", () => {
    const kinds = [
      "mcp",
      "hook",
      "skill",
      "subagent",
      "rule",
      "slash-command",
      "settings-fragment",
    ] as const;
    const entries = kinds.map((kind) => ({
      kind,
      source: `${kind}/file.md`,
      target: { scope: "global" as const, path: `${kind}/file.md` },
      sha256: SHA256,
      version: "0.1.0",
    }));
    const fixture = { version: "0.1.0", entries };
    const parsed = bundleManifestSchema.parse(fixture);
    const reparsed = bundleManifestSchema.parse(
      JSON.parse(JSON.stringify(parsed)),
    );
    expect(reparsed).toEqual(parsed);
  });

  it("rejects invalid sha256", () => {
    expect(() =>
      bundleManifestSchema.parse({
        version: "0.1.0",
        entries: [
          {
            kind: "skill",
            source: "skills/tdd.md",
            target: { scope: "global", path: "skills/tdd.md" },
            sha256: "invalid-hash",
            version: "0.1.0",
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects unknown target scope", () => {
    expect(() =>
      bundleManifestSchema.parse({
        version: "0.1.0",
        entries: [
          {
            kind: "skill",
            source: "skills/tdd.md",
            target: { scope: "workspace", path: "skills/tdd.md" },
            sha256: SHA256,
            version: "0.1.0",
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects unknown entry kind", () => {
    expect(() =>
      bundleManifestSchema.parse({
        version: "0.1.0",
        entries: [
          {
            kind: "unknown-kind",
            source: "unknown/file.md",
            target: { scope: "global", path: "unknown/file.md" },
            sha256: SHA256,
            version: "0.1.0",
          },
        ],
      }),
    ).toThrow();
  });
});

describe("managedManifestSchema", () => {
  it("round-trip with full fixture", () => {
    const fixture = {
      version: "0.1.0",
      files: [
        { path: ".claude/skills/tdd.md", sha256: SHA256, kind: "skill" },
        { path: ".claude/rules/jbird.md", sha256: SHA256, kind: "rule" },
      ],
      writtenAt: TIMESTAMP,
    };
    const parsed = managedManifestSchema.parse(fixture);
    const reparsed = managedManifestSchema.parse(
      JSON.parse(JSON.stringify(parsed)),
    );
    expect(reparsed).toEqual(parsed);
  });

  it("round-trip with zero files", () => {
    const fixture = { version: "0.1.0", files: [], writtenAt: TIMESTAMP };
    const parsed = managedManifestSchema.parse(fixture);
    const reparsed = managedManifestSchema.parse(
      JSON.parse(JSON.stringify(parsed)),
    );
    expect(reparsed).toEqual(parsed);
  });

  it("rejects invalid sha256 in files", () => {
    expect(() =>
      managedManifestSchema.parse({
        version: "0.1.0",
        files: [{ path: ".claude/test.md", sha256: "badhash", kind: "skill" }],
        writtenAt: TIMESTAMP,
      }),
    ).toThrow();
  });
});
