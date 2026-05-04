import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { StateDir } from "./StateDir.ts";
import type { Fs } from "./ports.ts";

function makeFakeFs(homeDirPath = "/home/user"): { fs: Fs; mkdirCalls: { path: string; mode: number | undefined }[] } {
  const mkdirCalls: { path: string; mode: number | undefined }[] = [];
  const fs: Fs = {
    readFile(): Promise<string | null> { return Promise.resolve(null); },
    writeFile(): Promise<void> { return Promise.resolve(); },
    appendFile(): Promise<void> { return Promise.resolve(); },
    mkdir(path: string, mode?: number): Promise<void> {
      mkdirCalls.push({ path, mode });
      return Promise.resolve();
    },
    exists(): Promise<boolean> { return Promise.resolve(false); },
    chmod(): Promise<void> { return Promise.resolve(); },
    homedir() { return homeDirPath; },
  };
  return { fs, mkdirCalls };
}

describe("StateDir.ensureGlobal", () => {
  it("creates ~/.jbird with mode 0700", async () => {
    const { fs, mkdirCalls } = makeFakeFs("/home/testuser");
    const stateDir = new StateDir(fs);
    await stateDir.ensureGlobal();
    const rootCall = mkdirCalls.find((c) => c.path === "/home/testuser/.jbird");
    expect(rootCall?.mode).toBe(0o700);
  });

  it("creates logs/, services/, cache/, stats/ subdirs with mode 0700", async () => {
    const { fs, mkdirCalls } = makeFakeFs("/home/testuser");
    const stateDir = new StateDir(fs);
    await stateDir.ensureGlobal();
    const paths = mkdirCalls.map((c) => c.path);
    expect(paths).toContain("/home/testuser/.jbird/logs");
    expect(paths).toContain("/home/testuser/.jbird/services");
    expect(paths).toContain("/home/testuser/.jbird/cache");
    expect(paths).toContain("/home/testuser/.jbird/stats");
    for (const call of mkdirCalls) {
      expect(call.mode).toBe(0o700);
    }
  });

  it("returns correct paths object", async () => {
    const { fs } = makeFakeFs("/home/testuser");
    const stateDir = new StateDir(fs);
    const paths = await stateDir.ensureGlobal();
    expect(paths.root).toBe("/home/testuser/.jbird");
    expect(paths.configPath).toBe("/home/testuser/.jbird/config.toml");
    expect(paths.logsDir).toBe("/home/testuser/.jbird/logs");
  });

  it("is idempotent (second call does not throw)", async () => {
    const { fs } = makeFakeFs();
    const stateDir = new StateDir(fs);
    await stateDir.ensureGlobal();
    // Second call should not throw (mkdir is recursive/idempotent)
    const paths = await stateDir.ensureGlobal();
    expect(paths.root).toBeTruthy();
  });
});

describe("StateDir.ensureProject", () => {
  it("creates <cwd>/.jbird with mode 0700", async () => {
    const { fs, mkdirCalls } = makeFakeFs();
    const stateDir = new StateDir(fs);
    await stateDir.ensureProject("/projects/myapp");
    const rootCall = mkdirCalls.find((c) => c.path === "/projects/myapp/.jbird");
    expect(rootCall?.mode).toBe(0o700);
  });

  it("returns correct paths", async () => {
    const { fs } = makeFakeFs();
    const stateDir = new StateDir(fs);
    const paths = await stateDir.ensureProject("/projects/myapp");
    expect(paths.root).toBe("/projects/myapp/.jbird");
    expect(paths.configPath).toBe("/projects/myapp/.jbird/config.toml");
  });
});

describe("StateDir path methods", () => {
  it("globalRoot returns ~/.jbird", () => {
    const { fs } = makeFakeFs("/home/alice");
    const stateDir = new StateDir(fs);
    expect(stateDir.globalRoot()).toBe(join("/home/alice", ".jbird"));
  });

  it("projectRoot returns <cwd>/.jbird", () => {
    const { fs } = makeFakeFs();
    const stateDir = new StateDir(fs);
    expect(stateDir.projectRoot("/my/project")).toBe("/my/project/.jbird");
  });
});
