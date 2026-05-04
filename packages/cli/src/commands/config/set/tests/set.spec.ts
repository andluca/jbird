import { describe, expect, it } from "bun:test";
import { runCli } from "../../../../shared/test/index.ts";

describe("jbird config set (E2E)", () => {
  it("exits with code 2 (not yet implemented)", async () => {
    const { exitCode } = await runCli(["config", "set", "proxy.port", "7878"]);
    expect(exitCode).toBe(2);
  });

  it("stdout contains 'not yet implemented'", async () => {
    const { stdout } = await runCli(["config", "set", "proxy.port", "7878"]);
    expect(stdout).toContain("not yet implemented");
  });
});
