import { describe, expect, it } from "bun:test";
import {
  isoTimestampSchema,
  pathSchema,
  portSchema,
  semverSchema,
  sha256Schema,
} from "./primitives.ts";

describe("semverSchema", () => {
  it("accepts valid semver '1.2.3'", () => {
    expect(semverSchema.parse("1.2.3")).toBe("1.2.3");
  });

  it("accepts '0.0.0'", () => {
    expect(semverSchema.parse("0.0.0")).toBe("0.0.0");
  });

  it("accepts prerelease '1.2.3-beta.1'", () => {
    expect(semverSchema.parse("1.2.3-beta.1")).toBe("1.2.3-beta.1");
  });

  it("rejects '1.2' (missing patch)", () => {
    expect(() => semverSchema.parse("1.2")).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => semverSchema.parse("")).toThrow();
  });

  it("rejects 'foo'", () => {
    expect(() => semverSchema.parse("foo")).toThrow();
  });
});

describe("portSchema", () => {
  it("accepts 7878", () => {
    expect(portSchema.parse(7878)).toBe(7878);
  });

  it("accepts min port 1", () => {
    expect(portSchema.parse(1)).toBe(1);
  });

  it("accepts max port 65535", () => {
    expect(portSchema.parse(65535)).toBe(65535);
  });

  it("rejects 0 (below min)", () => {
    expect(() => portSchema.parse(0)).toThrow();
  });

  it("rejects 65536 (above max)", () => {
    expect(() => portSchema.parse(65536)).toThrow();
  });

  it("rejects -1", () => {
    expect(() => portSchema.parse(-1)).toThrow();
  });

  it("rejects 1.5 (non-integer)", () => {
    expect(() => portSchema.parse(1.5)).toThrow();
  });

  it("rejects string '7878'", () => {
    expect(() => portSchema.parse("7878")).toThrow();
  });
});

describe("isoTimestampSchema", () => {
  it("accepts valid ISO datetime with Z", () => {
    expect(isoTimestampSchema.parse("2026-05-03T12:00:00.000Z")).toBe(
      "2026-05-03T12:00:00.000Z",
    );
  });

  it("rejects date-only '2026-05-03'", () => {
    expect(() => isoTimestampSchema.parse("2026-05-03")).toThrow();
  });

  it("rejects 'now'", () => {
    expect(() => isoTimestampSchema.parse("now")).toThrow();
  });
});

describe("sha256Schema", () => {
  it("accepts valid sha256 digest with prefix", () => {
    expect(sha256Schema.parse("sha256:" + "a".repeat(64))).toBe(
      "sha256:" + "a".repeat(64),
    );
  });

  it("rejects without 'sha256:' prefix", () => {
    expect(() => sha256Schema.parse("a".repeat(64))).toThrow();
  });

  it("rejects short hex", () => {
    expect(() => sha256Schema.parse("sha256:" + "a".repeat(63))).toThrow();
  });

  it("rejects uppercase hex", () => {
    expect(() => sha256Schema.parse("sha256:" + "A".repeat(64))).toThrow();
  });
});

describe("pathSchema", () => {
  it("accepts non-empty path", () => {
    expect(pathSchema.parse("/some/path")).toBe("/some/path");
  });

  it("rejects empty string", () => {
    expect(() => pathSchema.parse("")).toThrow();
  });
});
