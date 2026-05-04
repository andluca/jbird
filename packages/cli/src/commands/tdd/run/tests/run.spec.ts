import { describe, expect, it } from "bun:test";
import { runCli } from "../../../../shared/test/index.ts";

describe("jbird tdd (E2E)", () => {
  it("exits with code 2 (not yet implemented)", async () => {
    const { exitCode } = await runCli(["tdd", "add login feature"]);
    expect(exitCode).toBe(2);
  });

  it("stdout contains 'not yet implemented'", async () => {
    const { stdout } = await runCli(["tdd", "add login feature"]);
    expect(stdout).toContain("not yet implemented");
  });

  it("jbird tdd --help exits 0 and shows Usage", async () => {
    const { stdout, exitCode } = await runCli(["tdd", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
  });
});
