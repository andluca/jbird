import { describe, expect, it, afterEach } from "bun:test";
import { runConfigGet } from "./get.ts";
import { ConfigError } from "@jbird/core";
import type { Stdout } from "../../../shared/services/ports.ts";
import type { ConfigLoader } from "../../../shared/services/ConfigLoader.ts";
import type { StateDir } from "../../../shared/services/StateDir.ts";
import type { CoreConfig } from "@jbird/core";

function makeStdout(): { stdout: Stdout; lines: string[] } {
  const lines: string[] = [];
  const stdout: Stdout = { write(line: string) { lines.push(line); } };
  return { stdout, lines };
}

function makeLoader(config: CoreConfig): ConfigLoader {
  return {
    load(): Promise<CoreConfig> { return Promise.resolve(config); },
    loadGlobal(): Promise<CoreConfig> { return Promise.resolve(config); },
    loadProject(): Promise<null> { return Promise.resolve(null); },
  } as unknown as ConfigLoader;
}

function makeStateDir(): StateDir {
  return {
    ensureGlobal(): Promise<{ root: string; configPath: string; logsDir: string; servicesDir: string; cacheDir: string; statsDir: string }> {
      return Promise.resolve({
        root: "/home/user/.jbird",
        configPath: "/home/user/.jbird/config.toml",
        logsDir: "/home/user/.jbird/logs",
        servicesDir: "/home/user/.jbird/services",
        cacheDir: "/home/user/.jbird/cache",
        statsDir: "/home/user/.jbird/stats",
      });
    },
    ensureProject(cwd: string): Promise<{ root: string; configPath: string }> {
      return Promise.resolve({ root: `${cwd}/.jbird`, configPath: `${cwd}/.jbird/config.toml` });
    },
    globalRoot() { return "/home/user/.jbird"; },
    projectRoot(cwd: string) { return `${cwd}/.jbird`; },
  } as unknown as StateDir;
}

const BASE_CONFIG: CoreConfig = {
  bundle: { version: "0.0.0", profile: "default" },
  services: { proxy: { autostart: true, port: 7878 } },
  routing: { defaultModel: "sonnet", rules: [] },
};

/** Captures stderr writes and restores the original on restore(). */
function captureStderr(): { messages: string[]; restore: () => void } {
  const messages: string[] = [];
  const orig = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk: string | Uint8Array) => {
    messages.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
    return true;
  };
  return { messages, restore: () => { process.stderr.write = orig; } };
}

describe("runConfigGet", () => {
  afterEach(() => {
    process.exitCode = 0;
  });

  it("writes primitive value to stdout", async () => {
    const { stdout, lines } = makeStdout();
    const loader = makeLoader(BASE_CONFIG);

    await runConfigGet({ key: "services.proxy.port", cwd: "/test/project" }, { stdout, configLoader: loader, stateDir: makeStateDir() });

    expect(lines.join("")).toBe("7878");
  });

  it("writes boolean value as string to stdout", async () => {
    const { stdout, lines } = makeStdout();
    const loader = makeLoader(BASE_CONFIG);

    await runConfigGet({ key: "services.proxy.autostart", cwd: "/test/project" }, { stdout, configLoader: loader, stateDir: makeStateDir() });

    expect(lines.join("")).toBe("true");
  });

  it("writes object value as JSON to stdout", async () => {
    const { stdout, lines } = makeStdout();
    const loader = makeLoader(BASE_CONFIG);

    await runConfigGet({ key: "services.proxy", cwd: "/test/project" }, { stdout, configLoader: loader, stateDir: makeStateDir() });

    const parsed = JSON.parse(lines.join("")) as unknown;
    expect(parsed).toEqual({ autostart: true, port: 7878 });
  });

  it("writes array value as JSON to stdout", async () => {
    const { stdout, lines } = makeStdout();
    const loader = makeLoader(BASE_CONFIG);

    await runConfigGet({ key: "routing.rules", cwd: "/test/project" }, { stdout, configLoader: loader, stateDir: makeStateDir() });

    expect(JSON.parse(lines.join(""))).toEqual([]);
  });

  it("sets exit code 1 and writes to stderr when key not found", async () => {
    const { stdout } = makeStdout();
    const loader = makeLoader(BASE_CONFIG);
    const { messages, restore } = captureStderr();

    try {
      await runConfigGet({ key: "nonexistent.key", cwd: "/test/project" }, { stdout, configLoader: loader, stateDir: makeStateDir() });
    } finally {
      restore();
    }

    expect(process.exitCode).toBe(1);
    expect(messages.join("")).toContain("key not found");
    expect(messages.join("")).toContain("nonexistent.key");
  });

  it("sets exit code 1 on ConfigError", async () => {
    const { stdout } = makeStdout();
    const failingLoader = {
      load(): Promise<never> { return Promise.reject(new ConfigError("parse failed", { kind: "parse-failed" })); },
    } as unknown as ConfigLoader;
    const { restore } = captureStderr();

    try {
      await runConfigGet({ key: "services.proxy.port", cwd: "/test/project" }, { stdout, configLoader: failingLoader, stateDir: makeStateDir() });
    } finally {
      restore();
    }

    expect(process.exitCode).toBe(1);
  });
});
