import { describe, expect, it } from "bun:test";
import { runCli } from "../../../../shared/test/index.ts";

describe("jbird init --prompt (generate mode E2E)", () => {
  it("exits with code 2 (not yet implemented)", async () => {
    const { exitCode } = await runCli(["init", "--prompt", "build a todo app"]);
    expect(exitCode).toBe(2);
  });

  it("stdout contains 'not yet implemented'", async () => {
    const { stdout } = await runCli(["init", "--prompt", "build a todo app"]);
    expect(stdout).toContain("not yet implemented");
  });
});
