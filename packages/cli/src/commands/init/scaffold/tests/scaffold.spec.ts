import { describe, expect, it } from "bun:test";
import { runCli } from "../../../../shared/test/index.ts";

describe("jbird init (scaffold mode E2E)", () => {
  it("exits with code 2 (not yet implemented)", async () => {
    const { exitCode } = await runCli(["init"]);
    expect(exitCode).toBe(2);
  });

  it("stdout contains 'not yet implemented'", async () => {
    const { stdout } = await runCli(["init"]);
    expect(stdout).toContain("not yet implemented");
  });

  it("jbird init --help exits 0 and shows Usage", async () => {
    const { stdout, exitCode } = await runCli(["init", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
  });
});
