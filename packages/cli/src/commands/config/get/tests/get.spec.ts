import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { runCli, setupTestRepo } from "../../../../shared/test/index.ts";
import type { TestRepo } from "../../../../shared/test/index.ts";

describe("jbird config get (E2E)", () => {
  let repo: TestRepo;

  beforeEach(async () => {
    repo = await setupTestRepo();
  });

  afterEach(async () => {
    await repo.cleanup();
  });

  it("returns default port when no config file exists", async () => {
    const { stdout, exitCode } = await runCli(["config", "get", "services.proxy.port"], { env: repo.env, cwd: repo.dir });
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe("7878");
  });

  it("returns default routing model when no config exists", async () => {
    const { stdout, exitCode } = await runCli(["config", "get", "routing.defaultModel"], { env: repo.env, cwd: repo.dir });
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe("sonnet");
  });

  it("exits 1 and writes to stderr for unknown key", async () => {
    const { stderr, exitCode } = await runCli(["config", "get", "nonexistent.key"], { env: repo.env, cwd: repo.dir });
    expect(exitCode).toBe(1);
    expect(stderr).toContain("key not found");
  });

  it("reads project config override for port", async () => {
    // Create project config with different port
    const projectJbirdDir = join(repo.dir, ".jbird");
    await mkdir(projectJbirdDir, { recursive: true });
    await writeFile(
      join(projectJbirdDir, "config.toml"),
      `[bundle]\nversion = "1.0.0"\n\n[services.proxy]\nport = 5555\n`,
      "utf8",
    );

    const { stdout, exitCode } = await runCli(["config", "get", "services.proxy.port"], { env: repo.env, cwd: repo.dir });
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe("5555");
  });

  it("creates ~/.jbird directory with mode 0700 on access", async () => {
    await runCli(["config", "get", "services.proxy.port"], { env: repo.env, cwd: repo.dir });

    const jbirdDir = join(repo.dir, ".jbird");
    const stats = await stat(jbirdDir);
    // Check owner permissions: rwx (0700)
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o700);
  });
});
