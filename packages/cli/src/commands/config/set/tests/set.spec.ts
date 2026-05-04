import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { runCli, setupTestRepo } from "../../../../shared/test/index.ts";
import type { TestRepo } from "../../../../shared/test/index.ts";

describe("jbird config set (E2E)", () => {
  let repo: TestRepo;

  beforeEach(async () => {
    repo = await setupTestRepo();
  });

  afterEach(async () => {
    await repo.cleanup();
  });

  it("creates global config.toml and sets the value (--global flag)", async () => {
    const { exitCode } = await runCli(
      ["config", "set", "--global", "services.proxy.port", "9999"],
      { env: repo.env, cwd: repo.dir },
    );
    expect(exitCode).toBe(0);

    const content = await readFile(join(repo.dir, ".jbird", "config.toml"), "utf8");
    expect(content).toContain("9999");
  });

  it("round-trip: set then get returns the same value", async () => {
    await runCli(
      ["config", "set", "--global", "services.proxy.port", "9999"],
      { env: repo.env, cwd: repo.dir },
    );

    const { stdout, exitCode } = await runCli(
      ["config", "get", "services.proxy.port"],
      { env: repo.env, cwd: repo.dir },
    );
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe("9999");
  });

  it("config file is created with mode 0600", async () => {
    await runCli(
      ["config", "set", "--global", "services.proxy.port", "9999"],
      { env: repo.env, cwd: repo.dir },
    );

    const configPath = join(repo.dir, ".jbird", "config.toml");
    const stats = await stat(configPath);
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("exits 1 when setting an invalid value", async () => {
    const { exitCode, stderr } = await runCli(
      ["config", "set", "--global", "services.proxy.port", "-99"],
      { env: repo.env, cwd: repo.dir },
    );
    expect(exitCode).toBe(1);
    expect(stderr.length).toBeGreaterThan(0);
  });

  it("project config (without --global) writes to cwd/.jbird/config.toml", async () => {
    const { exitCode } = await runCli(
      ["config", "set", "services.proxy.port", "4321"],
      { env: repo.env, cwd: repo.dir },
    );
    expect(exitCode).toBe(0);

    const content = await readFile(join(repo.dir, ".jbird", "config.toml"), "utf8");
    expect(content).toContain("4321");
  });
});
