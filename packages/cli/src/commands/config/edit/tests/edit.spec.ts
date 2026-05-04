import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { runCli, setupTestRepo } from "../../../../shared/test/index.ts";
import type { TestRepo } from "../../../../shared/test/index.ts";

describe("jbird config edit (E2E)", () => {
  let repo: TestRepo;

  beforeEach(async () => {
    repo = await setupTestRepo();
  });

  afterEach(async () => {
    await repo.cleanup();
  });

  it("opens editor and exits 0 when EDITOR=true (no-op editor)", async () => {
    // 'true' is a POSIX no-op command that exits 0
    const { exitCode } = await runCli(
      ["config", "edit", "--global"],
      { env: { ...repo.env, VISUAL: undefined, EDITOR: "true" }, cwd: repo.dir },
    );
    expect(exitCode).toBe(0);
  });

  it("writes 'config saved' to stdout after successful edit", async () => {
    const { stdout } = await runCli(
      ["config", "edit", "--global"],
      { env: { ...repo.env, VISUAL: undefined, EDITOR: "true" }, cwd: repo.dir },
    );
    expect(stdout).toContain("config saved");
  });

  it("exits 1 when editor returns non-zero (EDITOR='false')", async () => {
    // 'false' is a POSIX command that exits 1
    const { exitCode } = await runCli(
      ["config", "edit", "--global"],
      { env: { ...repo.env, VISUAL: undefined, EDITOR: "false" }, cwd: repo.dir },
    );
    expect(exitCode).toBe(1);
  });
});
