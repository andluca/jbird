import { describe, expect, it } from "bun:test";
import { runCli } from "../../../../shared/test/index.ts";

describe("jbird services status (E2E)", () => {
  it("exits with code 2 (not yet implemented)", async () => {
    const { exitCode } = await runCli(["services", "status"]);
    expect(exitCode).toBe(2);
  });

  it("stdout contains 'not yet implemented'", async () => {
    const { stdout } = await runCli(["services", "status"]);
    expect(stdout).toContain("not yet implemented");
  });
});
