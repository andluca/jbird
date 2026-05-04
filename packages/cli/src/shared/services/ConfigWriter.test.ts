import { describe, expect, it } from "bun:test";
import { ConfigWriter } from "./ConfigWriter.ts";
import { ConfigLoader } from "./ConfigLoader.ts";
import { StateDir } from "./StateDir.ts";
import type { Logger } from "@jbird/core";
import type { Fs, Toml } from "./ports.ts";

// ─── Test doubles ─────────────────────────────────────────────────────────────

function makeNullLogger(): Logger {
  const logger: Logger = {
    debug() { return; },
    info() { return; },
    warn() { return; },
    error() { return; },
    child() { return logger; },
  };
  return logger;
}

interface WriteCall { path: string; content: string; mode?: number }

interface FakeFsState {
  files: Record<string, string>;
  writeCalls: WriteCall[];
  chmodCalls: { path: string; mode: number }[];
}

function makeFakeFs(initialFiles: Record<string, string> = {}, homeDirPath = "/home/user"): { fs: Fs; state: FakeFsState } {
  const state: FakeFsState = {
    files: { ...initialFiles },
    writeCalls: [],
    chmodCalls: [],
  };
  const fs: Fs = {
    readFile(path: string): Promise<string | null> { return Promise.resolve(state.files[path] ?? null); },
    writeFile(path: string, content: string, mode?: number): Promise<void> {
      state.files[path] = content;
      const entry: WriteCall = { path, content };
      if (mode !== undefined) entry.mode = mode;
      state.writeCalls.push(entry);
      return Promise.resolve();
    },
    appendFile(): Promise<void> { return Promise.resolve(); },
    mkdir(): Promise<void> { return Promise.resolve(); },
    exists(path: string): Promise<boolean> { return Promise.resolve(path in state.files); },
    chmod(path: string, mode: number): Promise<void> {
      state.chmodCalls.push({ path, mode });
      return Promise.resolve();
    },
    homedir() { return homeDirPath; },
  };
  return { fs, state };
}

async function makeRealToml(): Promise<Toml> {
  const { createTomlAdapter } = await import("../integrations/toml.ts");
  return createTomlAdapter();
}

function makeWriter(fs: Fs, toml: Toml): ConfigWriter {
  const stateDir = new StateDir(fs);
  const loader = new ConfigLoader(fs, toml, stateDir, makeNullLogger());
  return new ConfigWriter(fs, toml, stateDir, loader);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ConfigWriter.setGlobal", () => {
  it("coerces numeric string to number when setting services.proxy.port", async () => {
    const { fs } = makeFakeFs();
    const toml = await makeRealToml();
    const writer = makeWriter(fs, toml);

    const result = await writer.setGlobal("services.proxy.port", "9999");

    expect(result.services.proxy.port).toBe(9999);
  });

  it("coerces 'false' string to boolean when setting services.proxy.autostart", async () => {
    const { fs } = makeFakeFs();
    const toml = await makeRealToml();
    const writer = makeWriter(fs, toml);

    const result = await writer.setGlobal("services.proxy.autostart", "false");

    expect(result.services.proxy.autostart).toBe(false);
  });

  it("writes config file with chmod 0600", async () => {
    const { fs, state } = makeFakeFs();
    const toml = await makeRealToml();
    const writer = makeWriter(fs, toml);

    await writer.setGlobal("services.proxy.port", "9999");

    const writeCall = state.writeCalls[0];
    expect(writeCall?.path).toContain("config.toml");
    expect(writeCall?.mode).toBe(0o600);
  });

  it("does NOT write file when schema validation fails", async () => {
    const { fs, state } = makeFakeFs();
    const toml = await makeRealToml();
    const writer = makeWriter(fs, toml);

    let threw = false;
    try {
      await writer.setGlobal("services.proxy.port", "-1");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(state.writeCalls.length).toBe(0);
  });

  it("throws ConfigError with kind validation-failed on invalid value", async () => {
    const { fs } = makeFakeFs();
    const toml = await makeRealToml();
    const writer = makeWriter(fs, toml);

    let caught: unknown;
    try {
      await writer.setGlobal("services.proxy.port", "-1");
    } catch (err) {
      caught = err;
    }
    expect(caught).toMatchObject({ details: { kind: "validation-failed" } });
  });

  it("creates global config file when it does not exist", async () => {
    const { fs, state } = makeFakeFs();
    const toml = await makeRealToml();
    const writer = makeWriter(fs, toml);

    await writer.setGlobal("services.proxy.port", "8888");

    expect(state.writeCalls.some((c) => c.path.includes("config.toml"))).toBe(true);
  });

  it("round-trips: set then read returns the same value", async () => {
    const { fs } = makeFakeFs();
    const toml = await makeRealToml();
    const stateDir = new StateDir(fs);
    const loader = new ConfigLoader(fs, toml, stateDir, makeNullLogger());
    const writer = new ConfigWriter(fs, toml, stateDir, loader);

    await writer.setGlobal("services.proxy.port", "5432");
    const loaded = await loader.loadGlobal();

    expect(loaded.services.proxy.port).toBe(5432);
  });
});

describe("ConfigWriter.setProject", () => {
  it("writes to <cwd>/.jbird/config.toml", async () => {
    const { fs, state } = makeFakeFs();
    const toml = await makeRealToml();
    const writer = makeWriter(fs, toml);

    await writer.setProject("/my/project", "services.proxy.port", "4321");

    expect(state.writeCalls.some((c) => c.path.includes("/my/project/.jbird/config.toml"))).toBe(true);
  });

  it("returns updated config after set", async () => {
    const { fs } = makeFakeFs();
    const toml = await makeRealToml();
    const writer = makeWriter(fs, toml);

    const result = await writer.setProject("/my/project", "routing.defaultModel", "haiku");

    expect(result.routing.defaultModel).toBe("haiku");
  });
});
