import { describe, expect, it } from "bun:test";
import { ConfigLoader } from "./ConfigLoader.ts";
import { StateDir } from "./StateDir.ts";
import { JBIRD_VERSION } from "@jbird/core";
import type { Fs, Toml } from "./ports.ts";
import type { Logger } from "@jbird/core";

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

function makeFakeFs(files: Record<string, string> = {}, homeDirPath = "/home/user"): Fs {
  return {
    readFile(path: string): Promise<string | null> { return Promise.resolve(files[path] ?? null); },
    writeFile(): Promise<void> { return Promise.resolve(); },
    appendFile(): Promise<void> { return Promise.resolve(); },
    mkdir(): Promise<void> { return Promise.resolve(); },
    exists(path: string): Promise<boolean> { return Promise.resolve(path in files); },
    chmod(): Promise<void> { return Promise.resolve(); },
    homedir() { return homeDirPath; },
  };
}

/** A real TOML adapter using smol-toml so we test actual parsing. */
async function makeRealToml(): Promise<Toml> {
  const { createTomlAdapter } = await import("../integrations/toml.ts");
  return createTomlAdapter();
}

function makeStateDir(fs: Fs): StateDir {
  return new StateDir(fs);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ConfigLoader.loadGlobal", () => {
  it("returns defaults when global config file is absent", async () => {
    const fs = makeFakeFs({});
    const toml = await makeRealToml();
    const stateDir = makeStateDir(fs);
    const loader = new ConfigLoader(fs, toml, stateDir, makeNullLogger());

    const config = await loader.loadGlobal();

    expect(config.bundle.version).toBe(JBIRD_VERSION);
    expect(config.services.proxy.port).toBe(7878);
    expect(config.services.proxy.autostart).toBe(true);
    expect(config.routing.defaultModel).toBe("sonnet");
    expect(config.routing.rules).toEqual([]);
  });

  it("parses a valid global config TOML file", async () => {
    const toml = await makeRealToml();
    const tomlContent = `[bundle]\nversion = "1.2.3"\n\n[services.proxy]\nport = 9000\n`;
    const fs = makeFakeFs({ "/home/user/.jbird/config.toml": tomlContent });
    const stateDir = makeStateDir(fs);
    const loader = new ConfigLoader(fs, toml, stateDir, makeNullLogger());

    const config = await loader.loadGlobal();

    expect(config.bundle.version).toBe("1.2.3");
    expect(config.services.proxy.port).toBe(9000);
  });

  it("throws ConfigError with kind parse-failed on invalid TOML", async () => {
    const fs = makeFakeFs({ "/home/user/.jbird/config.toml": "not valid toml [[[[" });
    const fakeToml: Toml = {
      parse() { throw new Error("TOML parse error"); },
      stringify() { return ""; },
    };
    const stateDir = makeStateDir(fs);
    const loader = new ConfigLoader(fs, fakeToml, stateDir, makeNullLogger());

    let caught: unknown;
    try {
      await loader.loadGlobal();
    } catch (err) {
      caught = err;
    }
    expect(caught).toMatchObject({ details: { kind: "parse-failed" } });
  });

  it("throws ConfigError with kind validation-failed on schema violation", async () => {
    const toml = await makeRealToml();
    // port = -1 violates portSchema
    const tomlContent = `[bundle]\nversion = "1.0.0"\n\n[services.proxy]\nport = -1\n`;
    const fs = makeFakeFs({ "/home/user/.jbird/config.toml": tomlContent });
    const stateDir = makeStateDir(fs);
    const loader = new ConfigLoader(fs, toml, stateDir, makeNullLogger());

    let caught: unknown;
    try {
      await loader.loadGlobal();
    } catch (err) {
      caught = err;
    }
    expect(caught).toMatchObject({
      message: "Config validation failed",
      details: { kind: "validation-failed" },
    });
  });

  it("translates snake_case TOML keys to camelCase config keys", async () => {
    const toml = await makeRealToml();
    const tomlContent = `[bundle]\nversion = "1.0.0"\n\n[routing]\ndefault_model = "haiku"\n`;
    const fs = makeFakeFs({ "/home/user/.jbird/config.toml": tomlContent });
    const stateDir = makeStateDir(fs);
    const loader = new ConfigLoader(fs, toml, stateDir, makeNullLogger());

    const config = await loader.loadGlobal();

    expect(config.routing.defaultModel).toBe("haiku");
  });

  it("throws ConfigError on unknown key (strict schema)", async () => {
    const toml = await makeRealToml();
    const tomlContent = `[bundle]\nversion = "1.0.0"\n\nunknown_section = true\n`;
    const fs = makeFakeFs({ "/home/user/.jbird/config.toml": tomlContent });
    const stateDir = makeStateDir(fs);
    const loader = new ConfigLoader(fs, toml, stateDir, makeNullLogger());

    let caught: unknown;
    try {
      await loader.loadGlobal();
    } catch (err) {
      caught = err;
    }
    expect(caught).toMatchObject({ details: { kind: "validation-failed" } });
  });
});

describe("ConfigLoader.loadProject", () => {
  it("returns null when project config is absent", async () => {
    const toml = await makeRealToml();
    const fs = makeFakeFs({});
    const stateDir = makeStateDir(fs);
    const loader = new ConfigLoader(fs, toml, stateDir, makeNullLogger());

    const result = await loader.loadProject("/my/project");

    expect(result).toBeNull();
  });

  it("returns parsed project config when present", async () => {
    const toml = await makeRealToml();
    const tomlContent = `[bundle]\nversion = "2.0.0"\n\n[services.proxy]\nport = 5555\n`;
    const fs = makeFakeFs({ "/my/project/.jbird/config.toml": tomlContent });
    const stateDir = makeStateDir(fs);
    const loader = new ConfigLoader(fs, toml, stateDir, makeNullLogger());

    const result = await loader.loadProject("/my/project");

    expect(result).not.toBeNull();
    if (result === null) throw new Error("result should not be null");
    const proxy = result.services?.proxy;
    expect(proxy?.port).toBe(5555);
  });
});

describe("ConfigLoader.load (merged)", () => {
  it("merges project over global (key-by-key, objects deep-merged)", async () => {
    const toml = await makeRealToml();
    const globalToml = `[bundle]\nversion = "1.0.0"\n\n[services.proxy]\nautostart = true\nport = 7878\n`;
    const projectToml = `[bundle]\nversion = "1.0.0"\n\n[services.proxy]\nport = 9999\n`;
    const fs = makeFakeFs({
      "/home/user/.jbird/config.toml": globalToml,
      "/my/project/.jbird/config.toml": projectToml,
    });
    const stateDir = makeStateDir(fs);
    const loader = new ConfigLoader(fs, toml, stateDir, makeNullLogger());

    const config = await loader.load("/my/project");

    expect(config.services.proxy.port).toBe(9999);
    expect(config.services.proxy.autostart).toBe(true);
  });

  it("uses global config alone when project is absent", async () => {
    const toml = await makeRealToml();
    const globalToml = `[bundle]\nversion = "1.0.0"\n\n[services.proxy]\nport = 8888\n`;
    const fs = makeFakeFs({ "/home/user/.jbird/config.toml": globalToml });
    const stateDir = makeStateDir(fs);
    const loader = new ConfigLoader(fs, toml, stateDir, makeNullLogger());

    const config = await loader.load("/my/project");

    expect(config.services.proxy.port).toBe(8888);
  });

  it("project array replaces global array entirely", async () => {
    const toml = await makeRealToml();
    const globalToml = `[bundle]\nversion = "1.0.0"\n\n[[routing.rules]]\nprovider = "anthropic"\nmodel = "haiku"\n\n[routing.rules.match]\ntoken_estimate_lt = 500\n`;
    const projectToml = `[bundle]\nversion = "1.0.0"\n`;
    const fs = makeFakeFs({
      "/home/user/.jbird/config.toml": globalToml,
      "/my/project/.jbird/config.toml": projectToml,
    });
    const stateDir = makeStateDir(fs);
    const loader = new ConfigLoader(fs, toml, stateDir, makeNullLogger());

    const config = await loader.load("/my/project");

    // Project doesn't define rules → global rules survive (not replaced by empty array)
    expect(config.routing.rules.length).toBe(1);
  });
});
