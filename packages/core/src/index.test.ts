import { describe, expect, it } from "bun:test";

describe("@jbird/core barrel", () => {
  it("carrega sem throw", async () => {
    const mod = await import("./index.ts");
    expect(mod).toBeDefined();
  });
});
