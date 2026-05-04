import { describe, expect, it } from "bun:test";
import { runCli } from "../../../../shared/test/index.ts";

describe("jbird audit (E2E)", () => {
  it("exits with code 2 (not yet implemented)", async () => {
    const { exitCode } = await runCli(["audit"]);
    expect(exitCode).toBe(2);
  });

  it("stdout contains 'not yet implemented'", async () => {
    const { stdout } = await runCli(["audit"]);
    expect(stdout).toContain("not yet implemented");
  });

  it("jbird audit --help exits 0 and shows Usage", async () => {
    const { stdout, exitCode } = await runCli(["audit", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
  });
});
